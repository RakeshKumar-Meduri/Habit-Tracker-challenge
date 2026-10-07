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
    const id = req.params.id as string;
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
    const groupId = req.user!.groupId;
    const saved = [];

    for (const s of rawItems) {
      if (!s || !s.name || typeof s.name !== 'string') continue;
      const cleanName = s.name.trim();
      if (!cleanName) continue;

      // Strict ownership: incoming user_id must not claim another user
      if (s.user_id && s.user_id !== userId) continue;

      let supp;
      if (s.id) {
        const existing = await prisma.supplement.findUnique({
          where: { id: s.id },
        });

        if (existing) {
          if (existing.user_id === userId) {
            // Update the user's existing supplement
            supp = await prisma.supplement.update({
              where: { id: s.id },
              data: {
                name: cleanName,
                dosage: s.dosage || null,
                timing: s.timing || null,
              },
            });
          } else {
            // NEVER auto-clone another user's supplement into current user's account!
            continue;
          }
        } else {
          // Check if this user already has a supplement with the same name to prevent duplicates
          const duplicate = await prisma.supplement.findFirst({
            where: {
              user_id: userId,
              name: { equals: cleanName, mode: 'insensitive' },
            },
          });

          if (duplicate) {
            supp = await prisma.supplement.update({
              where: { id: duplicate.id },
              data: {
                dosage: s.dosage || duplicate.dosage,
                timing: s.timing || duplicate.timing,
              },
            });
          } else {
            supp = await prisma.supplement.create({
              data: {
                id: s.id,
                user_id: userId,
                name: cleanName,
                dosage: s.dosage || null,
                timing: s.timing || null,
              },
            });
          }
        }
      } else {
        // No ID provided, check for existing by name
        const duplicate = await prisma.supplement.findFirst({
          where: {
            user_id: userId,
            name: { equals: cleanName, mode: 'insensitive' },
          },
        });

        if (duplicate) {
          supp = await prisma.supplement.update({
            where: { id: duplicate.id },
            data: {
              dosage: s.dosage || duplicate.dosage,
              timing: s.timing || duplicate.timing,
            },
          });
        } else {
          supp = await prisma.supplement.create({
            data: {
              user_id: userId,
              name: cleanName,
              dosage: s.dosage || null,
              timing: s.timing || null,
            },
          });
        }
      }

      if (supp) {
        saved.push(supp);
      }
    }

    if (groupId) {
      await invalidateGroupSync(groupId);
    }

    for (const supp of saved) {
      broadcast({
        type: WS_EVENTS.SUPPLEMENT_ADDED,
        payload: supp,
      }, null, groupId);
    }

    res.json({ success: true, supplements: saved });
  } catch (err) {
    next(err);
  }
});

router.delete('/api/supplements/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    // Find target supplement to identify its name
    const target = await prisma.supplement.findFirst({
      where: {
        OR: [
          { id, user_id: userId },
          { id },
        ],
      },
    });

    if (target && target.user_id === userId) {
      // Delete any duplicates with the same name as well as this specific id
      await prisma.supplement.deleteMany({
        where: {
          user_id: userId,
          OR: [
            { id: target.id },
            { id },
            { name: { equals: target.name.trim(), mode: 'insensitive' } },
          ],
        },
      });
    } else {
      await prisma.supplement.deleteMany({
        where: { id, user_id: userId },
      });
    }

    if (groupId) {
      await invalidateGroupSync(groupId);
    }

    broadcast({
      type: WS_EVENTS.SUPPLEMENT_DELETED,
      payload: { id },
    }, null, groupId);

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

router.post('/api/supplement-logs', requireAuth, async (req, res, next) => {
  try {
    const raw = req.body;
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

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

    if (groupId) {
      await invalidateGroupSync(groupId);
    }

    broadcast({
      type: WS_EVENTS.SUPPLEMENT_LOG_UPDATED,
      payload: saved,
    }, null, groupId);

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
    const groupId = req.user!.groupId;
    const saved = [];

    for (const h of rawItems) {
      if (!h || !h.title || typeof h.title !== 'string') continue;
      const cleanTitle = h.title.trim();
      if (!cleanTitle) continue;

      if (h.user_id && h.user_id !== userId) continue;

      let habit;
      if (h.id) {
        const existing = await prisma.customHabit.findUnique({
          where: { id: h.id },
        });

        if (existing) {
          if (existing.user_id === userId) {
            habit = await prisma.customHabit.update({
              where: { id: h.id },
              data: {
                title: cleanTitle,
                description: h.description || null,
                is_private: h.is_private ?? true,
              },
            });
          } else {
            // NEVER auto-clone another user's habit into current user's account!
            continue;
          }
        } else {
          // Check for existing duplicate by title
          const duplicate = await prisma.customHabit.findFirst({
            where: {
              user_id: userId,
              title: { equals: cleanTitle, mode: 'insensitive' },
            },
          });

          if (duplicate) {
            habit = await prisma.customHabit.update({
              where: { id: duplicate.id },
              data: {
                description: h.description || duplicate.description,
                is_private: h.is_private ?? duplicate.is_private,
              },
            });
          } else {
            habit = await prisma.customHabit.create({
              data: {
                id: h.id,
                user_id: userId,
                title: cleanTitle,
                description: h.description || null,
                is_private: h.is_private ?? true,
              },
            });
          }
        }
      } else {
        const duplicate = await prisma.customHabit.findFirst({
          where: {
            user_id: userId,
            title: { equals: cleanTitle, mode: 'insensitive' },
          },
        });

        if (duplicate) {
          habit = await prisma.customHabit.update({
            where: { id: duplicate.id },
            data: {
              description: h.description || duplicate.description,
              is_private: h.is_private ?? duplicate.is_private,
            },
          });
        } else {
          habit = await prisma.customHabit.create({
            data: {
              user_id: userId,
              title: cleanTitle,
              description: h.description || null,
              is_private: h.is_private ?? true,
            },
          });
        }
      }

      if (habit) {
        saved.push(habit);
      }
    }

    if (groupId) {
      await invalidateGroupSync(groupId);
    }

    for (const habit of saved) {
      broadcast({
        type: WS_EVENTS.CUSTOM_HABIT_ADDED,
        payload: habit,
      }, null, groupId);
    }

    res.json({ success: true, habits: saved });
  } catch (err) {
    next(err);
  }
});

router.delete('/api/custom-habits/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

    const target = await prisma.customHabit.findFirst({
      where: {
        OR: [
          { id, user_id: userId },
          { id },
        ],
      },
    });

    if (target && target.user_id === userId) {
      await prisma.customHabit.deleteMany({
        where: {
          user_id: userId,
          OR: [
            { id: target.id },
            { id },
            { title: { equals: target.title.trim(), mode: 'insensitive' } },
          ],
        },
      });
    } else {
      await prisma.customHabit.deleteMany({
        where: { id, user_id: userId },
      });
    }

    if (groupId) {
      await invalidateGroupSync(groupId);
    }

    broadcast({
      type: WS_EVENTS.CUSTOM_HABIT_DELETED,
      payload: { id },
    }, null, groupId);

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

router.post('/api/custom-habit-logs', requireAuth, async (req, res, next) => {
  try {
    const raw = req.body;
    const userId = req.user!.id;
    const groupId = req.user!.groupId;

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

    if (groupId) {
      await invalidateGroupSync(groupId);
    }

    broadcast({
      type: WS_EVENTS.CUSTOM_HABIT_LOG_UPDATED,
      payload: saved,
    }, null, groupId);

    res.json({ success: true, log: saved });
  } catch (err) {
    next(err);
  }
});

export default router;
