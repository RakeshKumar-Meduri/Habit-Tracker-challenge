import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { sanitizeUser } from '../utils/crypto';
import { getCachedGroupSync, cacheGroupSync } from '../db/redis';

const router = Router();

// ----------------------------------------------------
// Group-Scoped State Sync (/api/sync)
// ----------------------------------------------------
router.get('/api/sync', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    if (!groupId) {
      // User has no group membership, return solo data
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const dailyLogs = await prisma.dailyLog.findMany({ where: { user_id: userId } });
      const workouts = await prisma.workout.findMany({ where: { user_id: userId, deleted_at: null } });
      const weightLogs = await prisma.weightLog.findMany({ where: { user_id: userId } });
      const badges = await prisma.badge.findMany({ where: { user_id: userId } });

      return res.json({
        success: true,
        data: {
          users: user ? [sanitizeUser(user)] : [],
          dailyLogs,
          workouts,
          weightLogs,
          missedReasons: [],
          reactions: [],
          badges,
          supplements: [],
          supplementLogs: [],
          customHabits: [],
          customHabitLogs: [],
          deletedWorkoutIds: [],
          group: null,
          myRole: null,
          invites: [],
        },
      });
    }

    // Try Redis cache acceleration first (Section 19)
    const cached = await getCachedGroupSync(groupId);
    if (cached) {
      return res.json({
        success: true,
        data: {
          ...cached,
          myRole: req.user!.groupRole,
        },
      });
    }

    // Load group details and members
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
        invites: {
          where: { revoked: false, expires_at: { gt: new Date() } },
        },
      },
    });

    if (!group) {
      return res.json({
        success: true,
        data: {
          users: [],
          dailyLogs: [],
          workouts: [],
          weightLogs: [],
          missedReasons: [],
          reactions: [],
          badges: [],
          supplements: [],
          supplementLogs: [],
          customHabits: [],
          customHabitLogs: [],
          deletedWorkoutIds: [],
          group: null,
          myRole: null,
          invites: [],
        },
      });
    }

    const memberUserIds = group.memberships
      .filter(m => m.user && m.user.is_active)
      .map(m => m.user.id);

    const safeUsers = group.memberships
      .filter(m => m.user && m.user.is_active)
      .map(m => sanitizeUser(m.user));

    // Parallel fetch of group-scoped data
    const [
      dailyLogs,
      rawWorkouts,
      weightLogs,
      missedReasons,
      reactions,
      badges,
      supplements,
      supplementLogs,
      rawCustomHabits,
      customHabitLogs,
      tombstones,
    ] = await Promise.all([
      prisma.dailyLog.findMany({
        where: { user_id: { in: memberUserIds } },
        orderBy: { date: 'desc' },
      }),
      prisma.workout.findMany({
        where: {
          user_id: { in: memberUserIds },
          deleted_at: null,
        },
        orderBy: { date: 'desc' },
      }),
      prisma.weightLog.findMany({
        where: { user_id: { in: memberUserIds } },
        orderBy: { date: 'desc' },
      }),
      prisma.missedReason.findMany({
        where: { user_id: { in: memberUserIds } },
      }),
      prisma.reaction.findMany({
        where: { from_user_id: { in: memberUserIds } },
      }),
      prisma.badge.findMany({
        where: { user_id: { in: memberUserIds } },
      }),
      prisma.supplement.findMany({
        where: { user_id: { in: memberUserIds } },
      }),
      prisma.supplementLog.findMany({
        where: { user_id: { in: memberUserIds } },
      }),
      prisma.customHabit.findMany({
        where: { user_id: { in: memberUserIds } },
      }),
      prisma.customHabitLog.findMany({
        where: { user_id: { in: memberUserIds } },
      }),
      prisma.deletedWorkout.findMany({
        select: { workout_id: true },
      }),
    ]);

    // Privacy filtering (Section 34)
    // Only return private workouts/habits to their respective owner
    const workouts = rawWorkouts.filter(w => !w.is_private || w.user_id === userId);
    const customHabits = rawCustomHabits.filter(h => !h.is_private || h.user_id === userId);
    const deletedWorkoutIds = tombstones.map(t => t.workout_id);

    const groupPayload = {
      id: group.id,
      name: group.name,
      owner_id: group.owner_id,
      created_at: group.created_at.toISOString(),
      step_target: group.step_target,
      members: group.memberships.map(m => ({
        user_id: m.user_id,
        role: m.role as 'owner' | 'member',
        joined_at: m.joined_at.toISOString(),
        name: m.user.name,
        username: m.user.username,
        avatar_color: m.user.avatar_color || undefined,
      })),
    };

    const syncData = {
      users: safeUsers,
      dailyLogs,
      workouts,
      weightLogs,
      missedReasons,
      reactions,
      badges,
      supplements,
      supplementLogs,
      customHabits,
      customHabitLogs,
      deletedWorkoutIds,
      group: groupPayload,
      invites: req.user!.groupRole === 'owner' ? group.invites : [],
    };

    // Cache in Redis for fast re-syncs
    await cacheGroupSync(groupId, syncData, 30);

    res.json({
      success: true,
      data: {
        ...syncData,
        myRole: req.user!.groupRole,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Batched Client Push Fallback (/api/sync/push)
// ----------------------------------------------------
router.post('/api/sync/push', requireAuth, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const userId = req.user!.id;

    // Process daily logs if present
    if (Array.isArray(payload.dailyLogs)) {
      for (const log of payload.dailyLogs) {
        if (!log || !log.date) continue;
        await prisma.dailyLog.upsert({
          where: {
            user_id_date: {
              user_id: userId,
              date: log.date,
            },
          },
          update: {
            gym_done: log.gym_done ?? false,
            steps_done: log.steps_done ?? false,
            steps_value: log.steps_value ?? 0,
            sleep_done: log.sleep_done ?? false,
            junk_food_avoided: log.junk_food_avoided ?? false,
            water_done: log.water_done ?? false,
          },
          create: {
            ...(log.id ? { id: log.id } : {}),
            user_id: userId,
            date: log.date,
            gym_done: log.gym_done ?? false,
            steps_done: log.steps_done ?? false,
            steps_value: log.steps_value ?? 0,
            sleep_done: log.sleep_done ?? false,
            junk_food_avoided: log.junk_food_avoided ?? false,
            water_done: log.water_done ?? false,
          },
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
