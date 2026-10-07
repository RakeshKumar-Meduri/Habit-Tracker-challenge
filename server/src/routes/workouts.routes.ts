import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { workoutItemSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { broadcast } from '../websocket/websocket.server';
import { invalidateGroupSync } from '../db/redis';
import { WS_EVENTS } from '../config/constants';

const router = Router();

// ----------------------------------------------------
// Create Workouts (Single or Batch)
// ----------------------------------------------------
router.post('/api/workouts', requireAuth, async (req, res, next) => {
  try {
    const rawItems = Array.isArray(req.body) ? req.body : [req.body];
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    const savedWorkouts = [];

    // Query active tombstones
    const tombstones = await prisma.deletedWorkout.findMany({
      select: { workout_id: true },
    });
    const tombstoneSet = new Set(tombstones.map(t => t.workout_id));

    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const validated = workoutItemSchema.parse(raw);

      // Skip tombstoned IDs
      if (validated.id && tombstoneSet.has(validated.id)) {
        continue;
      }

      const workout = await prisma.workout.create({
        data: {
          ...(validated.id ? { id: validated.id } : {}),
          user_id: userId,
          group_id: groupId,
          date: validated.date,
          exercise_name: validated.exercise_name,
          exercise_type: validated.exercise_type,
          sets: validated.sets,
          reps: validated.reps,
          weight: validated.weight,
          weight_unit: validated.weight_unit,
          duration: validated.duration,
          notes: validated.notes,
          is_private: validated.is_private,
        },
      });

      savedWorkouts.push(workout);
    }

    if (groupId) {
      await invalidateGroupSync(groupId);
    }

    if (savedWorkouts.length > 0) {
      broadcast({
        type: WS_EVENTS.WORKOUTS_ADDED,
        payload: savedWorkouts,
      }, null, groupId);
    }

    res.json({
      success: true,
      workouts: savedWorkouts,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Delete Workout Helper (Creator-Only Enforcement)
// ----------------------------------------------------
async function deleteWorkoutInternal(id: string, userId: string, groupId: string | null) {
  const workout = await prisma.workout.findUnique({
    where: { id },
  });

  if (!workout) {
    // If not found, check if already tombstoned
    return { success: true, id };
  }

  // Enforce creator ownership
  if (workout.user_id !== userId) {
    throw new AppError('Forbidden: You can only delete your own workouts.', 403, 'FORBIDDEN');
  }

  // Soft delete + record tombstone in a transaction
  await prisma.$transaction([
    prisma.workout.update({
      where: { id },
      data: { deleted_at: new Date() },
    }),
    prisma.deletedWorkout.upsert({
      where: { workout_id: id },
      update: { deleted_at: new Date() },
      create: { workout_id: id, user_id: userId },
    }),
  ]);

  if (groupId) {
    await invalidateGroupSync(groupId);
  }

  broadcast({
    type: WS_EVENTS.WORKOUT_DELETED,
    payload: { id },
  }, null, groupId);

  return { success: true, id };
}

// DELETE /api/workouts/:id
router.delete('/api/workouts/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const result = await deleteWorkoutInternal(id, req.user!.id, req.user!.groupId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/workouts/delete
router.post('/api/workouts/delete', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.body || {};
    if (!id) {
      throw new AppError('Workout ID is required', 400, 'MISSING_ID');
    }
    const result = await deleteWorkoutInternal(id, req.user!.id, req.user!.groupId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/workouts/clear-all (Clears workouts of authenticated user)
router.post('/api/workouts/clear-all', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    const userWorkouts = await prisma.workout.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { id: true },
    });

    const ids = userWorkouts.map(w => w.id);

    await prisma.$transaction([
      prisma.workout.updateMany({
        where: { user_id: userId },
        data: { deleted_at: new Date() },
      }),
      ...ids.map(id =>
        prisma.deletedWorkout.upsert({
          where: { workout_id: id },
          update: { deleted_at: new Date() },
          create: { workout_id: id, user_id: userId },
        })
      ),
    ]);

    if (groupId) {
      await invalidateGroupSync(groupId);
    }

    broadcast({
      type: WS_EVENTS.WORKOUTS_CLEARED,
      payload: { userId },
    }, null, groupId);

    res.json({ success: true, count: ids.length });
  } catch (err) {
    next(err);
  }
});

export default router;
