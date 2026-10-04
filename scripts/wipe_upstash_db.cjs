const { Redis } = require('@upstash/redis');
const fs = require('fs');
const path = require('path');

// Try loading .env if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.substring(0, idx).trim();
      const v = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  });
}

const url = process.env.KV_REST_API_URL || 
            process.env.UPSTASH_REDIS_REST_URL || 
            process.env.STORAGE_REST_API_URL ||
            process.env.REDIS_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN || 
              process.env.UPSTASH_REDIS_REST_TOKEN || 
              process.env.STORAGE_REST_API_TOKEN ||
              process.env.REDIS_REST_API_TOKEN;

const cleanDb = {
  users: [],
  groups: [],
  memberships: [],
  invites: [],
  sessions: [],
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
  adminSettings: {
    step_target: 10000,
    sleep_min_hours: 7.0,
    sleep_max_hours: 9.0,
    water_target_ml: 2500,
    cheat_days_enabled: true,
    day_cutoff_hour: 0
  }
};

async function wipe() {
  console.log('--- PURGING TEST ACCOUNTS & RAKESH_MEDURI ---');

  // 1. Wipe local pulse_db.json
  const localDbPath = path.join(__dirname, '..', 'server', 'data', 'pulse_db.json');
  fs.writeFileSync(localDbPath, JSON.stringify(cleanDb, null, 2), 'utf8');
  console.log(`[OK] Local database reset: ${localDbPath}`);

  // 2. Wipe Upstash Redis if credentials available
  if (url && token) {
    try {
      const redis = new Redis({ url, token });
      await redis.set('pulse_db', JSON.stringify(cleanDb));
      console.log('[OK] Upstash Redis `pulse_db` reset successfully in the cloud!');
    } catch (err) {
      console.error('[WARN] Upstash Redis reset error:', err.message);
    }
  } else {
    console.log('[INFO] No remote Upstash Redis credentials found in local environment.');
    console.log('       To wipe remote Upstash, either run this with credentials or clear `pulse_db` in Upstash Console.');
  }

  console.log('--- ALL TEST USERS & RAKESH_MEDURI REMOVED ---');
}

wipe();
