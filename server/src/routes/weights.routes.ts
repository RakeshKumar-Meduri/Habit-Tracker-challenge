import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { weightLogSchema } from '../utils/validation';
import { broadcast } from '../websocket/websocket.server';
import { invalidateGroupSync } from '../db/redis';
import { WS_EVENTS } from '../config/constants';

const router = Router();

async function handleWeightLog(req: any, res: any, next: any) {
  try {
    const validated = weightLogSchema.parse(req.body);
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    // Transaction: Save weight log and update user's current weight
    const [weightLog] = await prisma.$transaction([
      prisma.weightLog.create({
        data: {
          ...(validated.id ? { id: validated.id } : {}),
          user_id: userId,
          weight: validated.weight,
          date: validated.date,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { weight_current: validated.weight },
      }),
    ]);

    if (groupId) {
      await invalidateGroupSync(groupId);
    }

    broadcast({
      type: WS_EVENTS.WEIGHT_LOG_ADDED,
      payload: weightLog,
    }, null, groupId);

    res.json({
      success: true,
      weightLog,
    });
  } catch (err) {
    next(err);
  }
}

router.post('/api/weights', requireAuth, handleWeightLog);
router.post('/api/weight-logs', requireAuth, handleWeightLog);

export default router;
