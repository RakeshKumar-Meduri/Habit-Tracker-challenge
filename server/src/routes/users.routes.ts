import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { sanitizeUser } from '../utils/crypto';
import { AppError } from '../middleware/errorHandler';
import { broadcast, broadcastClientCount } from '../websocket/websocket.server';
import { invalidateGroupSync } from '../db/redis';
import { WS_EVENTS } from '../config/constants';

const router = Router();

// ----------------------------------------------------
// Get Users in Caller's Group
// ----------------------------------------------------
router.get('/api/users', requireAuth, async (req, res, next) => {
  try {
    const groupId = req.user!.groupId;

    if (!groupId) {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });
      return res.json({ success: true, users: user ? [sanitizeUser(user)] : [] });
    }

    const memberships = await prisma.membership.findMany({
      where: { group_id: groupId },
      include: { user: true },
    });

    const activeUsers = memberships
      .map(m => m.user)
      .filter(u => u && u.is_active)
      .map(u => sanitizeUser(u));

    res.json({
      success: true,
      users: activeUsers,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Get User by ID or Username
// ----------------------------------------------------
router.get('/api/users/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const clean = id.trim().replace(/^@+/, '').toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id },
          { username: clean },
        ],
        is_active: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Update User Profile
// ----------------------------------------------------
router.put('/api/users/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const callerId = req.user!.id;

    if (callerId !== id) {
      throw new AppError('Forbidden: You can only edit your own profile', 403, 'FORBIDDEN');
    }

    const body = req.body || {};
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name ? { name: String(body.name).trim() } : {}),
        ...(body.height ? { height: Number(body.height) } : {}),
        ...(body.weight_current ? { weight_current: Number(body.weight_current) } : {}),
        ...(body.age ? { age: Number(body.age) } : {}),
        ...(body.gender ? { gender: body.gender } : {}),
        ...(body.birthday ? { birthday: body.birthday } : {}),
        ...(body.photo_url !== undefined ? { photo_url: body.photo_url } : {}),
        ...(body.body_shape_photo !== undefined ? { body_shape_photo: body.body_shape_photo } : {}),
        ...(body.is_private !== undefined ? { is_private: Boolean(body.is_private) } : {}),
        ...(body.avatar_color ? { avatar_color: body.avatar_color } : {}),
        ...(body.onboarded !== undefined ? { onboarded: Boolean(body.onboarded) } : {}),
        ...(body.must_change_password !== undefined ? { must_change_password: Boolean(body.must_change_password) } : {}),
      },
    });

    const safeUser = sanitizeUser(updated);

    if (req.user!.groupId) {
      await invalidateGroupSync(req.user!.groupId);
      broadcast({
        type: WS_EVENTS.USER_UPDATED,
        payload: safeUser,
      }, null, req.user!.groupId);
    }

    res.json({
      success: true,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Delete User Account (Transaction-Safe Deletion / Deactivation)
// ----------------------------------------------------
router.delete('/api/users/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const callerId = req.user!.id;

    if (callerId !== id) {
      throw new AppError('Forbidden: You can only delete your own account', 403, 'FORBIDDEN');
    }

    const groupId = req.user!.groupId;

    // Transactionally soft-delete user and revoke sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { is_active: false },
      }),
      prisma.session.updateMany({
        where: { user_id: id },
        data: { revoked_at: new Date() },
      }),
      prisma.membership.deleteMany({
        where: { user_id: id },
      }),
    ]);

    if (groupId) {
      await invalidateGroupSync(groupId);
      broadcast({
        type: WS_EVENTS.USER_DELETED,
        payload: { userId: id },
      }, null, groupId);
    }

    broadcastClientCount();

    res.json({
      success: true,
      message: `User ${id} deactivated successfully`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
