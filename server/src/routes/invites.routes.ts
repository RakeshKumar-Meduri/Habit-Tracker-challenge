import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { inviteLimiter } from '../middleware/rateLimit';
import { createInviteSchema } from '../utils/validation';
import { hashToken } from '../utils/crypto';
import { AppError } from '../middleware/errorHandler';
import { broadcast } from '../websocket/websocket.server';
import { invalidateGroupSync } from '../db/redis';
import { WS_EVENTS } from '../config/constants';
import { ENV } from '../config/env';
import { getUserPlanTier } from '../services/payment.service';

const router = Router();

// ----------------------------------------------------
// Create Group Invite (Owner with Pro Plan Only)
// ----------------------------------------------------
router.post('/api/groups/:id/invites', requireAuth, inviteLimiter, async (req, res, next) => {
  try {
    const { id: groupId } = req.params;
    const validated = createInviteSchema.parse(req.body);

    const tier = await getUserPlanTier(req.user!.id);
    if (tier !== 'pro') {
      throw new AppError('Creating group invites requires an active PULSE Pro plan. Upgrade to Pro to invite members.', 403, 'PRO_PLAN_REQUIRED');
    }

    const membership = await prisma.membership.findUnique({
      where: {
        user_id_group_id: {
          user_id: req.user!.id,
          group_id: groupId,
        },
      },
    });

    if (!membership || membership.role !== 'owner') {
      throw new AppError('Forbidden: Only the group owner can create invite links.', 403, 'FORBIDDEN');
    }

    const token = crypto.randomBytes(16).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + validated.expiresInDays * 24 * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        token,
        token_hash: tokenHash,
        group_id: groupId,
        created_by: req.user!.id,
        max_uses: validated.maxUses,
        uses: 0,
        expires_at: expiresAt,
      },
    });

    const inviteUrl = `${ENV.FRONTEND_URL}/join/${token}`;

    broadcast({
      type: WS_EVENTS.INVITE_CREATED,
      payload: invite,
    }, null, groupId);

    res.json({
      success: true,
      token,
      url: inviteUrl,
      invite,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Public Invite Preview (No Auth Required)
// ----------------------------------------------------
router.get('/api/invites/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tokenHash = hashToken(token);

    const invite = await prisma.invite.findFirst({
      where: {
        OR: [
          { token },
          { token_hash: tokenHash },
        ],
      },
      include: {
        group: {
          include: {
            memberships: true,
          },
        },
        creator: true,
      },
    });

    if (!invite || invite.revoked) {
      return res.json({
        success: true,
        valid: false,
        reason: 'Invite link is invalid or has been revoked.',
      });
    }

    if (new Date(invite.expires_at) <= new Date()) {
      return res.json({
        success: true,
        valid: false,
        reason: 'This invite link has expired.',
      });
    }

    if (invite.uses >= invite.max_uses) {
      return res.json({
        success: true,
        valid: false,
        reason: 'This invite link has reached its maximum uses.',
      });
    }

    return res.json({
      success: true,
      valid: true,
      groupName: invite.group.name,
      inviterName: invite.creator.name,
      memberCount: invite.group.memberships.length,
    });
  } catch (err) {
    return res.json({
      success: false,
      valid: false,
      reason: 'Failed to inspect invite link.',
    });
  }
});

// ----------------------------------------------------
// Redeem Invite for Authenticated User (Requires Pro Plan)
// ----------------------------------------------------
router.post('/api/invites/:token/redeem', requireAuth, inviteLimiter, async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user!.id;
    const tokenHash = hashToken(token);

    const userTier = await getUserPlanTier(userId);
    if (userTier !== 'pro') {
      throw new AppError('Joining a group requires an active PULSE Pro plan. Please upgrade to Pro to join this group.', 403, 'PRO_PLAN_REQUIRED');
    }

    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.invite.findFirst({
        where: {
          OR: [
            { token },
            { token_hash: tokenHash },
          ],
        },
        include: { group: true },
      });

      if (!invite || invite.revoked) {
        throw new AppError('Invite link is invalid or has been revoked.', 400, 'INVALID_INVITE');
      }
      if (new Date(invite.expires_at) <= new Date()) {
        throw new AppError('This invite link has expired.', 400, 'INVITE_EXPIRED');
      }
      if (invite.uses >= invite.max_uses) {
        throw new AppError('This invite link has reached its maximum uses.', 400, 'INVITE_MAX_USES');
      }

      // Check if already in this group
      const existingMembership = await tx.membership.findUnique({
        where: {
          user_id_group_id: {
            user_id: userId,
            group_id: invite.group_id,
          },
        },
      });

      if (existingMembership) {
        throw new AppError('You are already a member of this group.', 400, 'ALREADY_MEMBER');
      }

      // Remove existing memberships
      await tx.membership.deleteMany({
        where: { user_id: userId },
      });

      // Create new membership in target group
      await tx.membership.create({
        data: {
          user_id: userId,
          group_id: invite.group_id,
          role: 'member',
        },
      });

      // Increment invite usage
      await tx.invite.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } },
      });

      return invite.group;
    });

    await invalidateGroupSync(result.id);

    broadcast({
      type: WS_EVENTS.GROUP_MEMBER_JOINED,
      payload: {
        userId,
        name: req.user!.name,
        username: req.user!.username,
        groupId: result.id,
      },
    }, null, result.id);

    res.json({
      success: true,
      message: `Successfully joined ${result.name}!`,
      group: result,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Revoke Invite (Owner Only)
// ----------------------------------------------------
router.delete('/api/invites/:token', requireAuth, async (req, res, next) => {
  try {
    const { token } = req.params;
    const tokenHash = hashToken(token);

    const invite = await prisma.invite.findFirst({
      where: {
        OR: [
          { token },
          { token_hash: tokenHash },
        ],
      },
    });

    if (!invite) {
      throw new AppError('Invite not found', 404, 'INVITE_NOT_FOUND');
    }

    const membership = await prisma.membership.findUnique({
      where: {
        user_id_group_id: {
          user_id: req.user!.id,
          group_id: invite.group_id,
        },
      },
    });

    const isCreator = invite.created_by === req.user!.id;
    const isOwner = membership && membership.role === 'owner';
    const group = await prisma.group.findUnique({ where: { id: invite.group_id } });
    const isMember = !!membership;

    if (!isCreator && !isOwner && !isGroupOwner && !isMember && req.user!.role !== 'admin') {
      throw new AppError('Forbidden: Only group members or invite creators can revoke invite links.', 403, 'FORBIDDEN');
    }

    await prisma.invite.update({
      where: { id: invite.id },
      data: { revoked: true },
    });

    broadcast({
      type: WS_EVENTS.INVITE_REVOKED,
      payload: { token: invite.token, groupId: invite.group_id },
    }, null, invite.group_id);

    res.json({
      success: true,
      message: 'Invite link revoked.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
