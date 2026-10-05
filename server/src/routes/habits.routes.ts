import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { broadcast } from '../websocket/websocket.server';
import { invalidateGroupSync } from '../db/redis';
import { WS_EVENTS } from '../config/constants';

const router = Router();

// ====================================================
// Missed Reasons
// ====================================================
router.post('/api/missed-reasons', requireAuth, async (req, res, next) => {
  try {
    const raw = req.body;
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    const saved = await prisma.missedReason.create({
      data: {
        ...(raw.id ? { id: raw.id } : {}),
        user_id: userId,
        daily_log_id: raw.daily_log_id || null,
        date: raw.date,
        goal_type: raw.goal_type,
        reason_tag: raw.reason_tag,
        reason_text: raw.reason_text || null,
      },
    });

    if (groupId) await invalidateGroupSync(groupId);

    broadcast({
      type: WS_EVENTS.MISSED_REASON_ADDED,
      payload: saved,
    }, null, groupId);

    res.json({ success: true, reason: saved });
  } catch (err) {
    next(err);
  }
});

router.post('/api/missed-reasons/delete', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.body;
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    await prisma.missedReason.deleteMany({
      where: { id, user_id: userId },
    });

    if (groupId) await invalidateGroupSync(groupId);

    broadcast({
      type: WS_EVENTS.MISSED_REASON_DELETED,
      payload: { id },
    }, null, groupId);

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

router.delete('/api/missed-reasons/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    await prisma.missedReason.deleteMany({
      where: { id, user_id: userId },
    });

    if (groupId) await invalidateGroupSync(groupId);

    broadcast({
      type: WS_EVENTS.MISSED_REASON_DELETED,
      payload: { id },
    }, null, groupId);

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

// ====================================================
// Reactions
// ====================================================
router.post('/api/reactions', requireAuth, async (req, res, next) => {
  try {
    const raw = req.body;
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    const saved = await prisma.reaction.create({
      data: {
        ...(raw.id ? { id: raw.id } : {}),
        from_user_id: userId,
        target_id: raw.target_id,
        target_type: raw.target_type || 'daily_log',
        emoji: raw.emoji,
      },
    });

    if (groupId) await invalidateGroupSync(groupId);

    broadcast({
      type: WS_EVENTS.REACTION_ADDED,
      payload: saved,
    }, null, groupId);

    res.json({ success: true, reaction: saved });
  } catch (err) {
    next(err);
  }
});

// ====================================================
// Badges
// ====================================================
router.post('/api/badges', requireAuth, async (req, res, next) => {
  try {
    const rawBadges = Array.isArray(req.body) ? req.body : [req.body];
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    const savedBadges = [];
    for (const b of rawBadges) {
      if (!b || !b.badge_type) continue;
      // Upsert badge to avoid duplicates
      const existing = await prisma.badge.findFirst({
        where: { user_id: userId, badge_type: b.badge_type },
      });
      if (!existing) {
        const created = await prisma.badge.create({
          data: {
            ...(b.id ? { id: b.id } : {}),
            user_id: userId,
            badge_type: b.badge_type,
            title: b.title || b.badge_type,
            description: b.description || '',
            icon: b.icon || '🏅',
            earned_date: b.earned_date || new Date().toISOString().split('T')[0],
          },
        });
        savedBadges.push(created);
      }
    }

    if (groupId) await invalidateGroupSync(groupId);

    if (savedBadges.length > 0) {
      broadcast({
        type: WS_EVENTS.BADGES_UPDATED,
        payload: { userId, badges: savedBadges },
      }, null, groupId);
    }

    res.json({ success: true, badges: savedBadges });
  } catch (err) {
    next(err);
  }
});

// ====================================================
// Supplements & Logs
// ====================================================
router.post('/api/supplements', requireAuth, async (req, res, next) => {
  try {
    const rawItems = Array.isArray(req.body) ? req.body : [req.body];
    const userId = req.user!.id;
    const saved = [];

    for (const s of rawItems) {
      if (!s || !s.name) continue;
      const supp = await prisma.supplement.create({
        data: {
          ...(s.id ? { id: s.id } : {}),
          user_id: userId,
          name: s.name,
          dosage: s.dosage || null,
          timing: s.timing || null,
        },
      });
      saved.push(supp);
    }

    res.json({ success: true, supplements: saved });
  } catch (err) {
    next(err);
  }
});

router.delete('/api/supplements/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await prisma.supplement.deleteMany({
      where: { id, user_id: userId },
    });
    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

router.post('/api/supplement-logs', requireAuth, async (req, res, next) => {
  try {
    const raw = req.body;
    const userId = req.user!.id;

    const saved = await prisma.supplementLog.upsert({
      where: {
        user_id_supplement_id_date: {
          user_id: userId,
          supplement_id: raw.supplement_id,
          date: raw.date,
        },
      },
      update: {
        taken: raw.taken ?? false,
      },
      create: {
        ...(raw.id ? { id: raw.id } : {}),
        user_id: userId,
        supplement_id: raw.supplement_id,
        date: raw.date,
        taken: raw.taken ?? false,
      },
    });

    res.json({ success: true, log: saved });
  } catch (err) {
    next(err);
  }
});

// ====================================================
// Custom Habits & Logs
// ====================================================
router.post('/api/custom-habits', requireAuth, async (req, res, next) => {
  try {
    const rawItems = Array.isArray(req.body) ? req.body : [req.body];
    const userId = req.user!.id;
    const saved = [];

    for (const h of rawItems) {
      if (!h || !h.title) continue;
      const habit = await prisma.customHabit.create({
        data: {
          ...(h.id ? { id: h.id } : {}),
          user_id: userId,
          title: h.title,
          description: h.description || null,
          is_private: h.is_private ?? true,
        },
      });
      saved.push(habit);
    }

    res.json({ success: true, habits: saved });
  } catch (err) {
    next(err);
  }
});

router.delete('/api/custom-habits/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await prisma.customHabit.deleteMany({
      where: { id, user_id: userId },
    });
    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

router.post('/api/custom-habit-logs', requireAuth, async (req, res, next) => {
  try {
    const raw = req.body;
    const userId = req.user!.id;

    const saved = await prisma.customHabitLog.upsert({
      where: {
        user_id_habit_id_date: {
          user_id: userId,
          habit_id: raw.habit_id,
          date: raw.date,
        },
      },
      update: {
        completed: raw.completed ?? false,
      },
      create: {
        ...(raw.id ? { id: raw.id } : {}),
        user_id: userId,
        habit_id: raw.habit_id,
        date: raw.date,
        completed: raw.completed ?? false,
      },
    });

    res.json({ success: true, log: saved });
  } catch (err) {
    next(err);
  }
});

export default router;
