import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { Redis } from '@upstash/redis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// -------------------------------------------------------
// Persistent Database Layer
// On Vercel / Cloud: uses Upstash Redis (permanent, survives cold starts)
// Locally: uses JSON file on disk
// -------------------------------------------------------
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'pulse_db.json');
const REDIS_KEY = 'pulse_db';

const DEFAULT_DB = {
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
  adminSettings: {
    step_target: 10000,
    sleep_min_hours: 7.0,
    sleep_max_hours: 9.0,
    water_target_ml: 2500,
    invite_code: 'PULSE2026',
    cheat_days_enabled: true,
    day_cutoff_hour: 0,
  },
};

function mergeDb(base, incoming) {
  if (!incoming || typeof incoming !== 'object') return { ...base };
  return {
    users: Array.isArray(incoming.users) ? incoming.users : (base.users || []),
    dailyLogs: Array.isArray(incoming.dailyLogs) ? incoming.dailyLogs : (base.dailyLogs || []),
    workouts: (Array.isArray(incoming.workouts) ? incoming.workouts : (base.workouts || [])).filter(w => w && w.id && w.id !== 'w_rakesh_1' && w.id !== 'w_rakesh_2' && w.exercise_name !== 'Barbell Bench Press' && w.exercise_name !== 'Treadmill Intervals & Core'),
    weightLogs: Array.isArray(incoming.weightLogs) ? incoming.weightLogs : (base.weightLogs || []),
    missedReasons: Array.isArray(incoming.missedReasons) ? incoming.missedReasons : (base.missedReasons || []),
    reactions: Array.isArray(incoming.reactions) ? incoming.reactions : (base.reactions || []),
    badges: Array.isArray(incoming.badges) ? incoming.badges : (base.badges || []),
    supplements: Array.isArray(incoming.supplements) ? incoming.supplements : (base.supplements || []),
    supplementLogs: Array.isArray(incoming.supplementLogs) ? incoming.supplementLogs : (base.supplementLogs || []),
    customHabits: Array.isArray(incoming.customHabits) ? incoming.customHabits : (base.customHabits || []),
    customHabitLogs: Array.isArray(incoming.customHabitLogs) ? incoming.customHabitLogs : (base.customHabitLogs || []),
    adminSettings: {
      ...base.adminSettings,
      ...(incoming.adminSettings || {}),
    },
  };
}

// Discover Redis credentials from any common Vercel / Upstash environment variable
function getRedisCredentials() {
  const url = process.env.KV_REST_API_URL || 
              process.env.UPSTASH_REDIS_REST_URL || 
              process.env.STORAGE_REST_API_URL ||
              process.env.REDIS_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN || 
                process.env.UPSTASH_REDIS_REST_TOKEN || 
                process.env.STORAGE_REST_API_TOKEN ||
                process.env.REDIS_REST_API_TOKEN;
  return { url, token };
}

const { url: REDIS_URL, token: REDIS_TOKEN } = getRedisCredentials();
const redis = (REDIS_URL && REDIS_TOKEN) ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

if (redis) {
  console.log('[PULSE Server] Upstash Redis initialized successfully');
} else {
  console.log('[PULSE Server] Running with local JSON storage at:', DB_FILE);
}

// Ensure local data directory exists
if (!IS_VERCEL && !fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

function getSeedDbPath() {
  const candidates = [
    path.join(__dirname, 'data', 'pulse_db.json'),
    path.join(__dirname, '..', 'server', 'data', 'pulse_db.json'),
    path.join(process.cwd(), 'server', 'data', 'pulse_db.json'),
    path.join(process.cwd(), 'pulse_db.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
}

// Load seed data from the committed JSON file
function loadSeedData() {
  const seedPath = getSeedDbPath();
  if (seedPath) {
    try {
      const data = fs.readFileSync(seedPath, 'utf-8');
      return mergeDb(DEFAULT_DB, JSON.parse(data));
    } catch (e) {
      console.warn('[PULSE Server] Failed to read seed DB:', e);
    }
  }
  return { ...DEFAULT_DB };
}

// LOCAL: synchronous file-based load
function loadDatabaseLocal() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return mergeDb(DEFAULT_DB, JSON.parse(data));
    }
  } catch (err) {
    console.error('[PULSE Server] Error reading local database file:', err);
  }
  return loadSeedData();
}

// VERCEL / REDIS: async Redis-based load
async function loadDatabaseRedis() {
  if (!redis) return loadDatabaseLocal();
  try {
    const data = await redis.get(REDIS_KEY);
    if (data) {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return mergeDb(DEFAULT_DB, parsed);
    }
    // No data in Redis yet — seed it from the committed JSON file
    console.log('[PULSE Server] No data in Redis, seeding from pulse_db.json...');
    const seed = loadSeedData();
    await redis.set(REDIS_KEY, JSON.stringify(seed));
    return seed;
  } catch (err) {
    console.error('[PULSE Server] Error loading from Redis:', err);
    return loadSeedData();
  }
}

let lastSavedHash = '';

// LOCAL: synchronous file save
function saveDatabaseLocal(database) {
  try {
    const serialized = JSON.stringify(database, null, 2);
    if (serialized === lastSavedHash) return;
    lastSavedHash = serialized;
    fs.writeFileSync(DB_FILE, serialized, 'utf-8');
  } catch (err) {
    console.error('[PULSE Server] Error saving local database file:', err);
  }
}

// VERCEL / REDIS: async Redis save
async function saveDatabaseRedis(database) {
  if (!redis) {
    saveDatabaseLocal(database);
    return;
  }
  try {
    const serialized = JSON.stringify(database);
    await redis.set(REDIS_KEY, serialized);
  } catch (err) {
    console.error('[PULSE Server] Error saving to Redis:', err);
    saveDatabaseLocal(database);
  }
}

// Unified save function (always awaited before HTTP response)
async function saveDatabase(database) {
  if (redis) {
    await saveDatabaseRedis(database);
  } else {
    saveDatabaseLocal(database);
  }
}

// Initialize db synchronously with local or seed
let db = loadDatabaseLocal();

// Hydrate from Redis on startup if available
if (redis) {
  loadDatabaseRedis().then(data => {
    if (data) {
      db = data;
      console.log(`[PULSE Server] Redis DB loaded: ${db.users.length} users, ${db.dailyLogs.length} logs`);
    }
  }).catch(err => {
    console.error('[PULSE Server] Error during initial Redis load:', err);
  });
}

// Middleware: ensure DB is always fresh from Redis before handling any /api request
app.use('/api', async (req, res, next) => {
  if (redis) {
    try {
      const fresh = await loadDatabaseRedis();
      if (fresh && fresh.users) {
        db = fresh;
      }
    } catch (err) {
      console.error('[PULSE Server] Error refreshing DB from Redis in middleware:', err);
    }
  }
  next();
});

// Password hashing helper (deterministic salt matching frontend)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_PULSE_SALT_2026').digest('hex');
}

// ----------------------------------------------------
// Real-Time WebSockets Engine
// ----------------------------------------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Set();

export function broadcast(event, senderWs = null) {
  const payload = JSON.stringify(event);
  for (const client of wsClients) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.error('[WS Broadcast Error]', err);
      }
    }
  }
}

export function getOnlineUserCount() {
  const onlineUserIds = new Set();
  let anonymousClients = 0;

  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      if (client.userId && db.users.some(u => u.id === client.userId && u.is_active !== false)) {
        onlineUserIds.add(client.userId);
      } else {
        anonymousClients++;
      }
    }
  }

  const activeUsersCount = db.users.filter(u => u.is_active !== false).length;

  if (onlineUserIds.size > 0) {
    return Math.min(onlineUserIds.size, activeUsersCount || 1);
  }

  if (activeUsersCount === 0) {
    return anonymousClients > 0 ? 1 : 0;
  }

  return Math.min(anonymousClients > 0 ? 1 : 0, activeUsersCount);
}

export function broadcastClientCount() {
  const count = getOnlineUserCount();
  broadcast({
    type: 'CLIENT_COUNT',
    payload: { clientCount: count },
  });
}

wss.on('connection', (ws) => {
  ws.userId = null;
  wsClients.add(ws);
  console.log(`[WS] Client connected. Total sockets: ${wsClients.size}, Online count: ${getOnlineUserCount()}`);

  // Send initial connection state and accurate online client count
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    payload: {
      clientCount: getOnlineUserCount(),
      timestamp: new Date().toISOString(),
    },
  }));

  // Broadcast updated client count to everyone
  broadcastClientCount();

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      } else if (msg.type === 'IDENTIFY') {
        const prevUserId = ws.userId;
        ws.userId = msg.payload?.userId || null;
        if (prevUserId !== ws.userId) {
          console.log(`[WS] Client identified: user=${ws.userId}. Online count: ${getOnlineUserCount()}`);
          broadcastClientCount();
        }
      }
    } catch (err) {
      console.error('[WS Message Parse Error]', err);
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[WS] Client disconnected. Total sockets: ${wsClients.size}, Online count: ${getOnlineUserCount()}`);
    broadcastClientCount();
  });

  ws.on('error', (err) => {
    console.error('[WS Error]', err);
    wsClients.delete(ws);
    broadcastClientCount();
  });
});

// ----------------------------------------------------
// REST API Endpoints
// ----------------------------------------------------

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    userCount: db.users.length,
    activeWsClients: wsClients.size,
    onlineUsers: getOnlineUserCount(),
    storage: redis ? 'upstash-redis' : 'local-json',
  });
});

// Full Sync (Fetch all shared data for all users)
app.get('/api/sync', async (req, res) => {
  if (redis) {
    try {
      const fresh = await loadDatabaseRedis();
      if (fresh && fresh.users) db = fresh;
    } catch {}
  }
  res.json({
    success: true,
    data: {
      users: db.users.filter(u => u.is_active !== false && u.username !== 'testuser123' && u.id !== 'user_1790589874177_elgx' && u.username !== 'testuser2' && u.id !== 'user_1790824958946_sy7b' && u.username !== 'tester1' && !u.username.startsWith('test')),
      dailyLogs: db.dailyLogs,
      workouts: (db.workouts || []).filter(w => w && w.id && w.id !== 'w_rakesh_1' && w.id !== 'w_rakesh_2' && w.exercise_name !== 'Barbell Bench Press' && w.exercise_name !== 'Treadmill Intervals & Core'),
      weightLogs: db.weightLogs,
      missedReasons: db.missedReasons,
      reactions: db.reactions,
      badges: db.badges,
      supplements: db.supplements || [],
      supplementLogs: db.supplementLogs || [],
      customHabits: db.customHabits || [],
      customHabitLogs: db.customHabitLogs || [],
      adminSettings: db.adminSettings,
    },
  });
});

// Register User
app.post('/api/auth/register', async (req, res) => {
  const newUser = req.body;
  if (!newUser || !newUser.username) {
    return res.status(400).json({ success: false, error: 'Username is required.' });
  }

  if (redis) {
    try {
      const fresh = await loadDatabaseRedis();
      if (fresh && fresh.users) db = fresh;
    } catch {}
  }

  const cleanUsername = newUser.username.trim().replace(/^@+/, '').toLowerCase();
  const existing = db.users.find(u => u.username.replace(/^@+/, '').toLowerCase() === cleanUsername);
  if (existing) {
    return res.status(409).json({ success: false, error: `Username @${cleanUsername} is already registered.` });
  }

  // Ensure password hash is populated
  if (!newUser.password_hash && newUser.passwordPlain) {
    newUser.password_hash = hashPassword(newUser.passwordPlain.trim());
  }

  newUser.username = cleanUsername;
  db.users.push(newUser);
  await saveDatabase(db);

  // Broadcast new user to all connected clients in real time
  broadcast({
    type: 'USER_REGISTERED',
    payload: newUser,
  });

  res.json({ success: true, user: newUser });
});

// Server-side Login Verification
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password, passwordHash } = req.body || {};
  if (!identifier || (!password && !passwordHash)) {
    return res.status(400).json({ success: false, error: 'Identifier and password are required.' });
  }

  if (redis) {
    try {
      const fresh = await loadDatabaseRedis();
      if (fresh && fresh.users) db = fresh;
    } catch {}
  }

  const rawClean = identifier.trim();
  const clean = rawClean.replace(/^@+/, '').toLowerCase();
  const user = db.users.find(
    u => u.username.replace(/^@+/, '').toLowerCase() === clean ||
         (u.name && u.name.toLowerCase() === clean) ||
         u.id === clean ||
         u.username.toLowerCase() === rawClean.toLowerCase()
  );

  if (!user || user.is_active === false) {
    return res.status(401).json({ success: false, error: 'Invalid username or password.' });
  }

  const computedHash = passwordHash || hashPassword(password);
  let isMatch = user.password_hash === computedHash;
  if (!isMatch && password) {
    isMatch = user.password_hash === hashPassword(password.trim());
  }
  if (!isMatch) {
    return res.status(401).json({ success: false, error: 'Incorrect password.' });
  }

  res.json({ success: true, user });
});

// Update User Profile
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  db.users[idx] = { ...db.users[idx], ...updatedData };
  await saveDatabase(db);

  broadcast({
    type: 'USER_UPDATED',
    payload: db.users[idx],
  });

  res.json({ success: true, user: db.users[idx] });
});

// Delete User Account
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  db.users = db.users.filter(u => u.id !== id);
  db.dailyLogs = db.dailyLogs.filter(l => l.user_id !== id);
  db.workouts = db.workouts.filter(w => w.user_id !== id);
  db.weightLogs = db.weightLogs.filter(w => w.user_id !== id);
  db.missedReasons = db.missedReasons.filter(m => m.user_id !== id);
  if (Array.isArray(db.supplements)) db.supplements = db.supplements.filter(s => s.user_id !== id);
  if (Array.isArray(db.supplementLogs)) db.supplementLogs = db.supplementLogs.filter(s => s.user_id !== id);
  if (Array.isArray(db.customHabits)) db.customHabits = db.customHabits.filter(h => h.user_id !== id);
  if (Array.isArray(db.customHabitLogs)) db.customHabitLogs = db.customHabitLogs.filter(h => h.user_id !== id);
  await saveDatabase(db);

  broadcast({
    type: 'USER_DELETED',
    payload: { userId: id },
  });

  for (const client of wsClients) {
    if (client.userId === id) client.userId = null;
  }
  broadcastClientCount();

  res.json({ success: true, message: `User ${id} deleted` });
});

// Update or Create Daily Log
app.post('/api/logs', async (req, res) => {
  const log = req.body;
  if (!log || !log.id) return res.status(400).json({ error: 'Invalid log' });

  const idx = db.dailyLogs.findIndex(l => l.id === log.id || (l.user_id === log.user_id && l.date === log.date));
  if (idx >= 0) {
    db.dailyLogs[idx] = { ...db.dailyLogs[idx], ...log };
  } else {
    db.dailyLogs.push(log);
  }
  await saveDatabase(db);

  // Real-time broadcast
  broadcast({
    type: 'DAILY_LOG_UPDATED',
    payload: log,
  });

  res.json({ success: true, log });
});

// Add Workouts
app.post('/api/workouts', async (req, res) => {
  const newWorkouts = req.body;
  const added = [];

  if (Array.isArray(newWorkouts)) {
    const map = new Map(db.workouts.map(w => [w.id, w]));
    newWorkouts.forEach(w => {
      map.set(w.id, w);
      added.push(w);
    });
    db.workouts = Array.from(map.values());
  } else if (newWorkouts && newWorkouts.id) {
    db.workouts = [newWorkouts, ...db.workouts.filter(w => w.id !== newWorkouts.id)];
    added.push(newWorkouts);
  }

  await saveDatabase(db);

  // Real-time broadcast
  broadcast({
    type: 'WORKOUTS_ADDED',
    payload: added,
  });

  res.json({ success: true });
});

// Delete Workout (DELETE method)
app.delete('/api/workouts/:id', async (req, res) => {
  const { id } = req.params;
  const targetId = String(id || '').trim();
  const initialLen = db.workouts.length;
  db.workouts = db.workouts.filter(w => String(w.id || '').trim() !== targetId);
  await saveDatabase(db);

  broadcast({
    type: 'WORKOUT_DELETED',
    payload: { id: targetId },
  });

  res.json({ success: true, deleted: db.workouts.length < initialLen });
});

// Delete Workout (POST method fallback)
app.post('/api/workouts/delete', async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing workout id' });
  const targetId = String(id).trim();
  const initialLen = db.workouts.length;
  db.workouts = db.workouts.filter(w => String(w.id || '').trim() !== targetId);
  await saveDatabase(db);

  broadcast({
    type: 'WORKOUT_DELETED',
    payload: { id: targetId },
  });

  res.json({ success: true, deleted: db.workouts.length < initialLen });
});

// Clear All Workouts
app.post('/api/workouts/clear-all', async (req, res) => {
  db.workouts = [];
  await saveDatabase(db);

  broadcast({
    type: 'WORKOUTS_CLEARED',
    payload: {},
  });

  res.json({ success: true, message: 'All workouts cleared' });
});

// Add Weight Log
app.post('/api/weights', async (req, res) => {
  const weightLog = req.body;
  if (!weightLog || !weightLog.id) return res.status(400).json({ error: 'Invalid weight log' });

  const map = new Map(db.weightLogs.map(w => [w.id, w]));
  map.set(weightLog.id, weightLog);
  db.weightLogs = Array.from(map.values());

  // Also update user's current weight in db.users
  const userIdx = db.users.findIndex(u => u.id === weightLog.user_id);
  if (userIdx >= 0) {
    db.users[userIdx].weight_current = weightLog.weight;
  }

  await saveDatabase(db);

  broadcast({
    type: 'WEIGHT_LOG_ADDED',
    payload: weightLog,
  });

  res.json({ success: true, weightLog });
});

// Add/Update Missed Reason
app.post('/api/missed-reasons', async (req, res) => {
  const reason = req.body;
  if (!reason || !reason.id) return res.status(400).json({ error: 'Invalid missed reason' });

  const map = new Map(db.missedReasons.map(r => [r.id, r]));
  map.set(reason.id, reason);
  db.missedReasons = Array.from(map.values());
  await saveDatabase(db);

  broadcast({
    type: 'MISSED_REASON_ADDED',
    payload: reason,
  });

  res.json({ success: true, reason });
});

// Add Reaction
app.post('/api/reactions', async (req, res) => {
  const reaction = req.body;
  if (!reaction || !reaction.id) return res.status(400).json({ error: 'Invalid reaction' });

  const map = new Map(db.reactions.map(r => [r.id, r]));
  map.set(reaction.id, reaction);
  db.reactions = Array.from(map.values());
  await saveDatabase(db);

  broadcast({
    type: 'REACTION_ADDED',
    payload: reaction,
  });

  res.json({ success: true, reaction });
});

// Update Badges
app.post('/api/badges', async (req, res) => {
  const badges = req.body;
  if (Array.isArray(badges)) {
    const map = new Map(db.badges.map(b => [b.id, b]));
    badges.forEach(b => map.set(b.id, b));
    db.badges = Array.from(map.values());
    await saveDatabase(db);

    broadcast({
      type: 'BADGES_UPDATED',
      payload: badges,
    });
  }
  res.json({ success: true });
});

// Supplements
app.post('/api/supplements', async (req, res) => {
  const supp = req.body;
  if (!supp || !supp.id) return res.status(400).json({ error: 'Invalid supplement' });

  db.supplements = [...(db.supplements || []).filter(s => s.id !== supp.id), supp];
  await saveDatabase(db);

  broadcast({
    type: 'SUPPLEMENT_ADDED',
    payload: supp,
  });

  res.json({ success: true, supplement: supp });
});

app.delete('/api/supplements/:id', async (req, res) => {
  const { id } = req.params;
  db.supplements = (db.supplements || []).filter(s => s.id !== id);
  db.supplementLogs = (db.supplementLogs || []).filter(l => l.supplement_id !== id);
  await saveDatabase(db);

  broadcast({
    type: 'SUPPLEMENT_DELETED',
    payload: { id },
  });

  res.json({ success: true, id });
});

app.post('/api/supplement-logs', async (req, res) => {
  const log = req.body;
  if (!log || !log.id) return res.status(400).json({ error: 'Invalid supplement log' });

  const map = new Map((db.supplementLogs || []).map(l => [l.id, l]));
  map.set(log.id, log);
  db.supplementLogs = Array.from(map.values());
  await saveDatabase(db);

  broadcast({
    type: 'SUPPLEMENT_LOG_UPDATED',
    payload: log,
  });

  res.json({ success: true, log });
});

// Custom Habits
app.post('/api/custom-habits', async (req, res) => {
  const habit = req.body;
  if (!habit || !habit.id) return res.status(400).json({ error: 'Invalid habit' });

  db.customHabits = [...(db.customHabits || []).filter(h => h.id !== habit.id), habit];
  await saveDatabase(db);

  broadcast({
    type: 'CUSTOM_HABIT_ADDED',
    payload: habit,
  });

  res.json({ success: true, habit });
});

app.delete('/api/custom-habits/:id', async (req, res) => {
  const { id } = req.params;
  db.customHabits = (db.customHabits || []).filter(h => h.id !== id);
  db.customHabitLogs = (db.customHabitLogs || []).filter(l => l.habit_id !== id);
  await saveDatabase(db);

  broadcast({
    type: 'CUSTOM_HABIT_DELETED',
    payload: { id },
  });

  res.json({ success: true, id });
});

app.post('/api/custom-habit-logs', async (req, res) => {
  const log = req.body;
  if (!log || !log.id) return res.status(400).json({ error: 'Invalid custom habit log' });

  const map = new Map((db.customHabitLogs || []).map(l => [l.id, l]));
  map.set(log.id, log);
  db.customHabitLogs = Array.from(map.values());
  await saveDatabase(db);

  broadcast({
    type: 'CUSTOM_HABIT_LOG_UPDATED',
    payload: log,
  });

  res.json({ success: true, log });
});

// Sync push from client (Merges updates)
app.post('/api/sync/push', async (req, res) => {
  const {
    users,
    deletedUserIds,
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
  } = req.body || {};

  if (Array.isArray(deletedUserIds) && deletedUserIds.length > 0) {
    const delSet = new Set(deletedUserIds);
    db.users = db.users.filter(u => !delSet.has(u.id));
    db.dailyLogs = db.dailyLogs.filter(l => !delSet.has(l.user_id));
    db.workouts = db.workouts.filter(w => !delSet.has(w.user_id));
    db.weightLogs = db.weightLogs.filter(w => !delSet.has(w.user_id));
  }

  if (Array.isArray(users)) {
    const userMap = new Map(db.users.map(u => [u.id, u]));
    users.forEach(u => userMap.set(u.id, u));
    db.users = Array.from(userMap.values());
  }

  if (Array.isArray(dailyLogs)) {
    const logMap = new Map(db.dailyLogs.map(l => [l.id, l]));
    dailyLogs.forEach(l => logMap.set(l.id, l));
    db.dailyLogs = Array.from(logMap.values());
  }

  if (Array.isArray(workouts)) {
    const workoutMap = new Map(db.workouts.map(w => [w.id, w]));
    workouts.forEach(w => workoutMap.set(w.id, w));
    db.workouts = Array.from(workoutMap.values());
  }

  if (Array.isArray(weightLogs)) {
    const weightMap = new Map(db.weightLogs.map(w => [w.id, w]));
    weightLogs.forEach(w => weightMap.set(w.id, w));
    db.weightLogs = Array.from(weightMap.values());
  }

  if (Array.isArray(missedReasons)) {
    const reasonMap = new Map(db.missedReasons.map(r => [r.id, r]));
    missedReasons.forEach(r => reasonMap.set(r.id, r));
    db.missedReasons = Array.from(reasonMap.values());
  }

  if (Array.isArray(reactions)) {
    const reactionMap = new Map(db.reactions.map(r => [r.id, r]));
    reactions.forEach(r => reactionMap.set(r.id, r));
    db.reactions = Array.from(reactionMap.values());
  }

  if (Array.isArray(badges)) {
    const badgeMap = new Map(db.badges.map(b => [b.id, b]));
    badges.forEach(b => badgeMap.set(b.id, b));
    db.badges = Array.from(badgeMap.values());
  }

  if (Array.isArray(supplements)) {
    const suppMap = new Map((db.supplements || []).map(s => [s.id, s]));
    supplements.forEach(s => suppMap.set(s.id, s));
    db.supplements = Array.from(suppMap.values());
  }

  if (Array.isArray(supplementLogs)) {
    const suppLogMap = new Map((db.supplementLogs || []).map(l => [l.id, l]));
    supplementLogs.forEach(l => suppLogMap.set(l.id, l));
    db.supplementLogs = Array.from(suppLogMap.values());
  }

  if (Array.isArray(customHabits)) {
    const habitMap = new Map((db.customHabits || []).map(h => [h.id, h]));
    customHabits.forEach(h => habitMap.set(h.id, h));
    db.customHabits = Array.from(habitMap.values());
  }

  if (Array.isArray(customHabitLogs)) {
    const habitLogMap = new Map((db.customHabitLogs || []).map(l => [l.id, l]));
    customHabitLogs.forEach(l => habitLogMap.set(l.id, l));
    db.customHabitLogs = Array.from(habitLogMap.values());
  }

  await saveDatabase(db);

  broadcast({
    type: 'FULL_SYNC',
    payload: {
      users: db.users,
      dailyLogs: db.dailyLogs,
      workouts: db.workouts,
      weightLogs: db.weightLogs,
      missedReasons: db.missedReasons,
      reactions: db.reactions,
      badges: db.badges,
      supplements: db.supplements || [],
      supplementLogs: db.supplementLogs || [],
      customHabits: db.customHabits || [],
      customHabitLogs: db.customHabitLogs || [],
    },
  });

  res.json({ success: true });
});

// Serve frontend in production (Single service hosting on Render/Railway/Fly/VPS)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`[PULSE Server] HTTP & WebSocket Server running on port ${PORT}`);
  });
}

export default app;
