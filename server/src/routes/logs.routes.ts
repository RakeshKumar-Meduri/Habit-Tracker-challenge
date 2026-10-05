import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { dailyLogSchema } from '../utils/validation';
import { calculateServerPoints } from '../utils/scoring';
import { broadcast } from '../websocket/websocket.server';
import { invalidateGroupSync } from '../db/redis';
import { WS_EVENTS } from '../config/constants';

const router = Router();

// ----------------------------------------------------
// Upsert Daily Log with Server-Calculated Points
// ----------------------------------------------------
router.post('/api/logs', requireAuth, async (req, res, next) => {
  try {
    const validated = dailyLogSchema.parse(req.body);
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    // Get group step target for proportional points calculation
    let groupStepTarget = 10000;
    if (groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { step_target: true },
      });
      if (group?.step_target) {
        groupStepTarget = group.step_target;
      }
    }

    // Server-authoritative calculation of points_earned
    const points_earned = calculateServerPoints({
      date: validated.date,
      gym_done: validated.gym_done,
      steps_done: validated.steps_done,
      steps_value: validated.steps_value,
      steps_target: validated.steps_target || groupStepTarget,
      sleep_done: validated.sleep_done,
      junk_food_avoided: validated.junk_food_avoided,
      water_done: validated.water_done,
    }, groupStepTarget);

    // Upsert daily log in PostgreSQL
    const savedLog = await prisma.dailyLog.upsert({
      where: {
        user_id_date: {
          user_id: userId,
          date: validated.date,
        },
      },
      update: {
        gym_done: validated.gym_done ?? false,
        steps_done: validated.steps_done ?? false,
        steps_value: validated.steps_value ?? 0,
        steps_target: validated.steps_target ?? groupStepTarget,
        sleep_done: validated.sleep_done ?? false,
        junk_food_avoided: validated.junk_food_avoided ?? false,
        cheat_day_used: validated.cheat_day_used ?? false,
        water_done: validated.water_done ?? false,
        water_intake_ml: validated.water_intake_ml ?? 0,
        water_target_ml: validated.water_target_ml ?? 2500,
        sleep_start: validated.sleep_start,
        sleep_end: validated.sleep_end,
        sleep_duration: validated.sleep_duration,
        points_earned,
      },
      create: {
        ...(validated.id ? { id: validated.id } : {}),
        user_id: userId,
        date: validated.date,
        gym_done: validated.gym_done ?? false,
        steps_done: validated.steps_done ?? false,
        steps_value: validated.steps_value ?? 0,
        steps_target: validated.steps_target ?? groupStepTarget,
        sleep_done: validated.sleep_done ?? false,
        junk_food_avoided: validated.junk_food_avoided ?? false,
        cheat_day_used: validated.cheat_day_used ?? false,
        water_done: validated.water_done ?? false,
        water_intake_ml: validated.water_intake_ml ?? 0,
        water_target_ml: validated.water_target_ml ?? 2500,
        sleep_start: validated.sleep_start,
        sleep_end: validated.sleep_end,
        sleep_duration: validated.sleep_duration,
        points_earned,
      },
    });

    if (groupId) {
      await invalidateGroupSync(groupId);
    }

    // Broadcast only after successful database commit
    broadcast({
      type: WS_EVENTS.DAILY_LOG_UPDATED,
      payload: savedLog,
    }, null, groupId);

    res.json({
      success: true,
      log: savedLog,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
