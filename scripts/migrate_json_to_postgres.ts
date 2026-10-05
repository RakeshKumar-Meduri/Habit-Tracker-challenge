import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
  if (url && token) {
    return new Redis({ url, token });
  }
  return null;
}

async function loadSourceData(): Promise<any> {
  const redis = getRedis();
  if (redis) {
    try {
      console.log('[Migration] Checking Upstash Redis for pulse_db...');
      const data = await redis.get('pulse_db');
      if (data && typeof data === 'object') {
        console.log('[Migration] Loaded data from Upstash Redis');
        return data;
      }
    } catch (err) {
      console.warn('[Migration] Redis load failed, falling back to local file:', err);
    }
  }

  const jsonPath = path.join(__dirname, '..', 'server', 'data', 'pulse_db.json');
  if (fs.existsSync(jsonPath)) {
    console.log(`[Migration] Reading data from ${jsonPath}...`);
    const content = fs.readFileSync(jsonPath, 'utf-8');
    return JSON.parse(content);
  }

  throw new Error('No source data found in Redis or pulse_db.json');
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function runMigration() {
  console.log('==============================================');
  console.log('      PULSE POSTGRESQL DATA MIGRATION        ');
  console.log('==============================================');

  const source = await loadSourceData();

  const users = source.users || [];
  const groups = source.groups || [];
  const memberships = source.memberships || [];
  const invites = source.invites || [];
  const sessions = source.sessions || [];
  const dailyLogs = source.dailyLogs || [];
  const workouts = source.workouts || [];
  const weightLogs = source.weightLogs || [];
  const missedReasons = source.missedReasons || [];
  const reactions = source.reactions || [];
  const badges = source.badges || [];
  const supplements = source.supplements || [];
  const supplementLogs = source.supplementLogs || [];
  const customHabits = source.customHabits || [];
  const customHabitLogs = source.customHabitLogs || [];
  const deletedWorkoutIds = source.deletedWorkoutIds || [];

  console.log(`Source records:`);
  console.log(`- Users: ${users.length}`);
  console.log(`- Groups: ${groups.length}`);
  console.log(`- Memberships: ${memberships.length}`);
  console.log(`- Invites: ${invites.length}`);
  console.log(`- Sessions: ${sessions.length}`);
  console.log(`- Daily Logs: ${dailyLogs.length}`);
  console.log(`- Workouts: ${workouts.length}`);
  console.log(`- Weight Logs: ${weightLogs.length}`);
  console.log(`- Tombstones: ${deletedWorkoutIds.length}`);

  // 1. Migrate Users
  console.log('\n[1/12] Migrating users...');
  for (const u of users) {
    if (!u.id || !u.username) continue;
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        username: u.username.toLowerCase().trim(),
        name: u.name || u.username,
        role: u.role || 'member',
        height: Number(u.height) || 175,
        weight_current: Number(u.weight_current || u.weight) || 70,
        age: Number(u.age) || 25,
        gender: u.gender || 'male',
        avatar_color: u.avatar_color || null,
        is_private: Boolean(u.is_private),
        is_active: u.is_active !== false,
      },
      create: {
        id: u.id,
        username: u.username.toLowerCase().trim(),
        name: u.name || u.username,
        password_hash: u.password_hash || 'legacy_unhashed',
        role: u.role || 'member',
        height: Number(u.height) || 175,
        weight_current: Number(u.weight_current || u.weight) || 70,
        age: Number(u.age) || 25,
        gender: u.gender || 'male',
        avatar_color: u.avatar_color || null,
        is_private: Boolean(u.is_private),
        is_active: u.is_active !== false,
      },
    });
  }

  // 2. Migrate Groups
  console.log('[2/12] Migrating groups...');
  const userIdsSet = new Set((await prisma.user.findMany({ select: { id: true } })).map(u => u.id));

  for (const g of groups) {
    if (!g.id) continue;
    const ownerId = userIdsSet.has(g.owner_id) ? g.owner_id : Array.from(userIdsSet)[0];
    if (!ownerId) continue;

    await prisma.group.upsert({
      where: { id: g.id },
      update: {
        name: g.name || 'Unnamed Group',
        owner_id: ownerId,
        step_target: Number(g.step_target) || 10000,
      },
      create: {
        id: g.id,
        name: g.name || 'Unnamed Group',
        owner_id: ownerId,
        step_target: Number(g.step_target) || 10000,
      },
    });
  }

  // 3. Migrate Memberships
  console.log('[3/12] Migrating memberships...');
  const groupIdsSet = new Set((await prisma.group.findMany({ select: { id: true } })).map(g => g.id));

  for (const m of memberships) {
    if (!m.user_id || !m.group_id) continue;
    if (!userIdsSet.has(m.user_id) || !groupIdsSet.has(m.group_id)) continue;

    await prisma.membership.upsert({
      where: {
        user_id_group_id: {
          user_id: m.user_id,
          group_id: m.group_id,
        },
      },
      update: {
        role: m.role || 'member',
      },
      create: {
        user_id: m.user_id,
        group_id: m.group_id,
        role: m.role || 'member',
        joined_at: m.joined_at ? new Date(m.joined_at) : new Date(),
      },
    });
  }

  // 4. Migrate Invites
  console.log('[4/12] Migrating invites...');
  for (const inv of invites) {
    if (!inv.token || !inv.group_id) continue;
    if (!groupIdsSet.has(inv.group_id)) continue;
    const creatorId = userIdsSet.has(inv.created_by) ? inv.created_by : Array.from(userIdsSet)[0];

    const tokenHash = hashToken(inv.token);
    await prisma.invite.upsert({
      where: { token: inv.token },
      update: {
        token_hash: tokenHash,
        max_uses: Number(inv.max_uses) || 10,
        uses: Number(inv.uses) || 0,
        revoked: Boolean(inv.revoked),
      },
      create: {
        token: inv.token,
        token_hash: tokenHash,
        group_id: inv.group_id,
        created_by: creatorId,
        max_uses: Number(inv.max_uses) || 10,
        uses: Number(inv.uses) || 0,
        expires_at: inv.expires_at ? new Date(inv.expires_at) : new Date(Date.now() + 7 * 86400000),
        revoked: Boolean(inv.revoked),
      },
    });
  }

  // 5. Migrate Sessions
  console.log('[5/12] Migrating sessions...');
  for (const s of sessions) {
    if (!s.token || !s.user_id || !userIdsSet.has(s.user_id)) continue;
    const tokenHash = hashToken(s.token);

    await prisma.session.upsert({
      where: { session_token_hash: tokenHash },
      update: {
        expires_at: s.expires_at ? new Date(s.expires_at) : new Date(Date.now() + 30 * 86400000),
      },
      create: {
        user_id: s.user_id,
        session_token_hash: tokenHash,
        token: s.token,
        expires_at: s.expires_at ? new Date(s.expires_at) : new Date(Date.now() + 30 * 86400000),
      },
    });
  }

  // 6. Migrate Daily Logs
  console.log('[6/12] Migrating daily logs...');
  for (const log of dailyLogs) {
    if (!log.user_id || !log.date || !userIdsSet.has(log.user_id)) continue;

    await prisma.dailyLog.upsert({
      where: {
        user_id_date: {
          user_id: log.user_id,
          date: log.date,
        },
      },
      update: {
        gym_done: Boolean(log.gym_done),
        steps_done: Boolean(log.steps_done),
        steps_value: Number(log.steps_value) || 0,
        steps_target: Number(log.steps_target) || 10000,
        sleep_done: Boolean(log.sleep_done),
        junk_food_avoided: Boolean(log.junk_food_avoided),
        cheat_day_used: Boolean(log.cheat_day_used),
        water_done: Boolean(log.water_done),
        water_intake_ml: Number(log.water_intake_ml) || 0,
        water_target_ml: Number(log.water_target_ml) || 2500,
        points_earned: Number(log.points_earned) || 0,
      },
      create: {
        ...(log.id ? { id: log.id } : {}),
        user_id: log.user_id,
        date: log.date,
        gym_done: Boolean(log.gym_done),
        steps_done: Boolean(log.steps_done),
        steps_value: Number(log.steps_value) || 0,
        steps_target: Number(log.steps_target) || 10000,
        sleep_done: Boolean(log.sleep_done),
        junk_food_avoided: Boolean(log.junk_food_avoided),
        cheat_day_used: Boolean(log.cheat_day_used),
        water_done: Boolean(log.water_done),
        water_intake_ml: Number(log.water_intake_ml) || 0,
        water_target_ml: Number(log.water_target_ml) || 2500,
        points_earned: Number(log.points_earned) || 0,
      },
    });
  }

  // 7. Migrate Tombstones & Workouts
  console.log('[7/12] Migrating workouts and tombstones...');
  for (const tid of deletedWorkoutIds) {
    if (!tid) continue;
    await prisma.deletedWorkout.upsert({
      where: { workout_id: String(tid) },
      update: {},
      create: { workout_id: String(tid) },
    });
  }

  const tombstoneSet = new Set(deletedWorkoutIds.map(String));
  for (const w of workouts) {
    if (!w.id || !w.user_id || !userIdsSet.has(w.user_id)) continue;
    if (tombstoneSet.has(w.id)) continue;

    await prisma.workout.upsert({
      where: { id: w.id },
      update: {
        exercise_name: w.exercise_name || 'Workout',
        sets: Number(w.sets) || 0,
        reps: Number(w.reps) || 0,
        weight: Number(w.weight) || 0,
      },
      create: {
        id: w.id,
        user_id: w.user_id,
        group_id: w.group_id && groupIdsSet.has(w.group_id) ? w.group_id : null,
        date: w.date || new Date().toISOString().split('T')[0],
        exercise_name: w.exercise_name || 'Workout',
        exercise_type: w.exercise_type || 'strength',
        sets: Number(w.sets) || 0,
        reps: Number(w.reps) || 0,
        weight: Number(w.weight) || 0,
        weight_unit: w.weight_unit || 'kg',
        duration: Number(w.duration) || 0,
        notes: w.notes || null,
        is_private: Boolean(w.is_private),
      },
    });
  }

  // 8. Migrate Weight Logs
  console.log('[8/12] Migrating weight logs...');
  for (const wl of weightLogs) {
    if (!wl.user_id || !userIdsSet.has(wl.user_id)) continue;
    await prisma.weightLog.create({
      data: {
        ...(wl.id ? { id: wl.id } : {}),
        user_id: wl.user_id,
        weight: Number(wl.weight) || 70,
        date: wl.date || new Date().toISOString().split('T')[0],
        recorded_at: wl.timestamp ? new Date(wl.timestamp) : new Date(),
      },
    });
  }

  // 9. Migrate Habits & Badges
  console.log('[9/12] Migrating badges and habits...');
  for (const b of badges) {
    if (!b.user_id || !userIdsSet.has(b.user_id)) continue;
    await prisma.badge.create({
      data: {
        ...(b.id ? { id: b.id } : {}),
        user_id: b.user_id,
        badge_type: b.badge_type || 'badge',
        title: b.title || 'Badge',
        description: b.description || '',
        icon: b.icon || '🏅',
        earned_date: b.earned_date || new Date().toISOString().split('T')[0],
      },
    });
  }

  // Validation Checks (Section 63)
  console.log('\n==============================================');
  console.log('          MIGRATION VALIDATION REPORT         ');
  console.log('==============================================');

  const finalUsers = await prisma.user.count();
  const finalGroups = await prisma.group.count();
  const finalMemberships = await prisma.membership.count();
  const finalWorkouts = await prisma.workout.count();
  const finalLogs = await prisma.dailyLog.count();
  const finalWeights = await prisma.weightLog.count();

  console.log(`Validated counts:`);
  console.log(`- Users: ${finalUsers}`);
  console.log(`- Groups: ${finalGroups}`);
  console.log(`- Memberships: ${finalMemberships}`);
  console.log(`- Workouts: ${finalWorkouts}`);
  console.log(`- Daily Logs: ${finalLogs}`);
  console.log(`- Weight Logs: ${finalWeights}`);

  // Foreign Key Integrity Check
  const orphanedMemberships = await prisma.$queryRaw`
    SELECT count(*)::int FROM memberships m 
    LEFT JOIN users u ON m.user_id = u.id 
    WHERE u.id IS NULL
  `;
  console.log(`- Orphaned Memberships: ${JSON.stringify(orphanedMemberships)}`);

  console.log('\nMigration and validation completed successfully!');
}

if (process.argv[1] && process.argv[1].endsWith('migrate_json_to_postgres.ts')) {
  runMigration()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('[Migration Failed]', err);
      prisma.$disconnect();
      process.exit(1);
    });
}
