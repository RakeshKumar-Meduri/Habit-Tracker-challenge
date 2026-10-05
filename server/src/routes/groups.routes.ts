import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { groupUpdateSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { broadcast } from '../websocket/websocket.server';
import { invalidateGroupSync } from '../db/redis';
import { WS_EVENTS } from '../config/constants';

const router = Router();

// ----------------------------------------------------
// Update Group Settings (Name and/or Step Target - Owner Only)
// ----------------------------------------------------
router.patch('/api/groups/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = groupUpdateSchema.parse(req.body);

    const membership = await prisma.membership.findUnique({
      where: {
        user_id_group_id: {
          user_id: req.user!.id,
          group_id: id,
        },
      },
    });

    if (!membership || membership.role !== 'owner') {
      throw new AppError('Forbidden: Only the group owner can modify group settings.', 403, 'FORBIDDEN');
    }

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: {
        ...(validated.name ? { name: validated.name.trim() } : {}),
        ...(validated.step_target ? { step_target: validated.step_target } : {}),
      },
    });

    await invalidateGroupSync(id);

    broadcast({
      type: WS_EVENTS.GROUP_UPDATED,
      payload: updatedGroup,
    }, null, id);

    res.json({
      success: true,
      group: updatedGroup,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Leave Current Group
// ----------------------------------------------------
router.post('/api/groups/:id/leave', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const membership = await prisma.membership.findUnique({
      where: {
        user_id_group_id: {
          user_id: userId,
          group_id: id,
        },
      },
    });

    if (!membership) {
      throw new AppError('You are not a member of this group.', 400, 'NOT_A_MEMBER');
    }

    // Check how many members are in group
    const memberCount = await prisma.membership.count({
      where: { group_id: id },
    });

    if (membership.role === 'owner' && memberCount > 1) {
      throw new AppError('As the group owner, you must transfer ownership before leaving or remove other members first.', 400, 'OWNER_CANNOT_LEAVE');
    }

    // Execute atomic transaction: leave old group and create new private group
    const newGroupName = `${req.user!.name.split(' ')[0]}'s Group`;

    await prisma.$transaction(async (tx) => {
      // Delete old membership
      await tx.membership.delete({
        where: {
          user_id_group_id: {
            user_id: userId,
            group_id: id,
          },
        },
      });

      // If owner was the sole member, clean up the old group
      if (membership.role === 'owner' && memberCount <= 1) {
        await tx.group.delete({ where: { id } }).catch(() => {});
      }

      // Create new solo group
      const newGroup = await tx.group.create({
        data: {
          name: newGroupName,
          owner_id: userId,
          step_target: 10000,
        },
      });

      // Join new solo group as owner
      await tx.membership.create({
        data: {
          user_id: userId,
          group_id: newGroup.id,
          role: 'owner',
        },
      });
    });

    await invalidateGroupSync(id);

    broadcast({
      type: WS_EVENTS.GROUP_MEMBER_LEFT,
      payload: { userId, groupId: id },
    }, null, id);

    res.json({
      success: true,
      message: 'Successfully left group.',
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Remove Member (Owner Only)
// ----------------------------------------------------
router.delete('/api/groups/:id/members/:userId', requireAuth, async (req, res, next) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const callerId = req.user!.id;

    if (callerId === targetUserId) {
      throw new AppError('Cannot kick yourself from the group. Use leave group instead.', 400, 'CANNOT_KICK_SELF');
    }

    const callerMembership = await prisma.membership.findUnique({
      where: {
        user_id_group_id: {
          user_id: callerId,
          group_id: id,
        },
      },
    });

    if (!callerMembership || callerMembership.role !== 'owner') {
      throw new AppError('Forbidden: Only the group owner can remove members.', 403, 'FORBIDDEN');
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        user_id_group_id: {
          user_id: targetUserId,
          group_id: id,
        },
      },
      include: { user: true },
    });

    if (!targetMembership) {
      throw new AppError('Member not found in this group.', 404, 'MEMBER_NOT_FOUND');
    }

    // Execute atomic kick & create new solo group for target user
    const targetName = targetMembership.user.name.split(' ')[0] || targetMembership.user.username;
    const newGroupName = `${targetName}'s Group`;

    await prisma.$transaction(async (tx) => {
      await tx.membership.delete({
        where: {
          user_id_group_id: {
            user_id: targetUserId,
            group_id: id,
          },
        },
      });

      const newGroup = await tx.group.create({
        data: {
          name: newGroupName,
          owner_id: targetUserId,
          step_target: 10000,
        },
      });

      await tx.membership.create({
        data: {
          user_id: targetUserId,
          group_id: newGroup.id,
          role: 'owner',
        },
      });
    });

    await invalidateGroupSync(id);

    broadcast({
      type: WS_EVENTS.GROUP_MEMBER_REMOVED,
      payload: { userId: targetUserId, groupId: id },
    }, null, id);

    res.json({
      success: true,
      message: 'Member removed successfully.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
