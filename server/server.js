import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Database file path (support Vercel serverless /tmp and local data directory)
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'pulse_db.json');
const SEED_DB_FILE = path.join(__dirname, 'data', 'pulse_db.json');

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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

function loadDatabase() {
  try {
    if (process.env.VERCEL) {
      if (!fs.existsSync(DB_FILE) && fs.existsSync(SEED_DB_FILE)) {
        try {
          fs.copyFileSync(SEED_DB_FILE, DB_FILE);
        } catch {}
      }
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return { ...DEFAULT_DB, ...JSON.parse(data) };
    }
    if (fs.existsSync(SEED_DB_FILE)) {
      const data = fs.readFileSync(SEED_DB_FILE, 'utf-8');
      return { ...DEFAULT_DB, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading database file, using defaults:', err);
  }
  return { ...DEFAULT_DB };
}

let lastSavedHash = '';

function saveDatabase(database) {
  try {
    const serialized = JSON.stringify(database, null, 2);
    if (serialized === lastSavedHash) return;
    lastSavedHash = serialized;
    fs.writeFileSync(DB_FILE, serialized, 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

let db = loadDatabase();

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
  });
});

// Full Sync (Fetch all shared data for all users)
app.get('/api/sync', (req, res) => {
  res.json({
    success: true,
    data: {
      users: db.users.filter(u => u.is_active !== false && u.username !== 'testuser123' && u.id !== 'user_1790589874177_elgx'),
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
      adminSettings: db.adminSettings,
    },
  });
});

// Register User
app.post('/api/auth/register', (req, res) => {
  const newUser = req.body;
  if (!newUser || !newUser.username) {
    return res.status(400).json({ success: false, error: 'Username is required.' });
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
  saveDatabase(db);

  // Broadcast new user to all connected clients in real time
  broadcast({
    type: 'USER_REGISTERED',
    payload: newUser,
  });

  res.json({ success: true, user: newUser });
});

// Server-side Login Verification
app.post('/api/auth/login', (req, res) => {
  const { identifier, password, passwordHash } = req.body || {};
  if (!identifier || (!password && !passwordHash)) {
    return res.status(400).json({ success: false, error: 'Identifier and password are required.' });
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
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  db.users[idx] = { ...db.users[idx], ...updatedData };
  saveDatabase(db);

  broadcast({
    type: 'USER_UPDATED',
    payload: db.users[idx],
  });

  res.json({ success: true, user: db.users[idx] });
});

// Delete User Account
app.delete('/api/users/:id', (req, res) => {
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
  saveDatabase(db);

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
app.post('/api/logs', (req, res) => {
  const log = req.body;
  if (!log || !log.id) return res.status(400).json({ error: 'Invalid log' });

  const idx = db.dailyLogs.findIndex(l => l.id === log.id || (l.user_id === log.user_id && l.date === log.date));
  if (idx >= 0) {
    db.dailyLogs[idx] = { ...db.dailyLogs[idx], ...log };
  } else {
    db.dailyLogs.push(log);
  }
  saveDatabase(db);

  // Real-time broadcast
  broadcast({
    type: 'DAILY_LOG_UPDATED',
    payload: log,
  });

  res.json({ success: true, log });
});

// Add Workouts
app.post('/api/workouts', (req, res) => {
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

  saveDatabase(db);

  // Real-time broadcast
  broadcast({
    type: 'WORKOUTS_ADDED',
    payload: added,
  });

  res.json({ success: true });
});

// Add Weight Log
app.post('/api/weights', (req, res) => {
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

  saveDatabase(db);

  broadcast({
    type: 'WEIGHT_LOG_ADDED',
    payload: weightLog,
  });

  res.json({ success: true, weightLog });
});

// Add/Update Missed Reason
app.post('/api/missed-reasons', (req, res) => {
  const reason = req.body;
  if (!reason || !reason.id) return res.status(400).json({ error: 'Invalid missed reason' });

  const map = new Map(db.missedReasons.map(r => [r.id, r]));
  map.set(reason.id, reason);
  db.missedReasons = Array.from(map.values());
  saveDatabase(db);

  broadcast({
    type: 'MISSED_REASON_ADDED',
    payload: reason,
  });

  res.json({ success: true, reason });
});

// Add Reaction
app.post('/api/reactions', (req, res) => {
  const reaction = req.body;
  if (!reaction || !reaction.id) return res.status(400).json({ error: 'Invalid reaction' });

  const map = new Map(db.reactions.map(r => [r.id, r]));
  map.set(reaction.id, reaction);
  db.reactions = Array.from(map.values());
  saveDatabase(db);

  broadcast({
    type: 'REACTION_ADDED',
    payload: reaction,
  });

  res.json({ success: true, reaction });
});

// Update Badges
app.post('/api/badges', (req, res) => {
  const badges = req.body;
  if (Array.isArray(badges)) {
    const map = new Map(db.badges.map(b => [b.id, b]));
    badges.forEach(b => map.set(b.id, b));
    db.badges = Array.from(map.values());
    saveDatabase(db);

    broadcast({
      type: 'BADGES_UPDATED',
      payload: badges,
    });
  }
  res.json({ success: true });
});

// Supplements
app.post('/api/supplements', (req, res) => {
  const supp = req.body;
  if (!supp || !supp.id) return res.status(400).json({ error: 'Invalid supplement' });

  db.supplements = [...(db.supplements || []).filter(s => s.id !== supp.id), supp];
  saveDatabase(db);

  broadcast({
    type: 'SUPPLEMENT_ADDED',
    payload: supp,
  });

  res.json({ success: true, supplement: supp });
});

app.delete('/api/supplements/:id', (req, res) => {
  const { id } = req.params;
  db.supplements = (db.supplements || []).filter(s => s.id !== id);
  db.supplementLogs = (db.supplementLogs || []).filter(l => l.supplement_id !== id);
  saveDatabase(db);

  broadcast({
    type: 'SUPPLEMENT_DELETED',
    payload: { id },
  });

  res.json({ success: true, id });
});

app.post('/api/supplement-logs', (req, res) => {
  const log = req.body;
  if (!log || !log.id) return res.status(400).json({ error: 'Invalid supplement log' });

  const map = new Map((db.supplementLogs || []).map(l => [l.id, l]));
  map.set(log.id, log);
  db.supplementLogs = Array.from(map.values());
  saveDatabase(db);

  broadcast({
    type: 'SUPPLEMENT_LOG_UPDATED',
    payload: log,
  });

  res.json({ success: true, log });
});

// Custom Habits
app.post('/api/custom-habits', (req, res) => {
  const habit = req.body;
  if (!habit || !habit.id) return res.status(400).json({ error: 'Invalid habit' });

  db.customHabits = [...(db.customHabits || []).filter(h => h.id !== habit.id), habit];
  saveDatabase(db);

  broadcast({
    type: 'CUSTOM_HABIT_ADDED',
    payload: habit,
  });

  res.json({ success: true, habit });
});

app.delete('/api/custom-habits/:id', (req, res) => {
  const { id } = req.params;
  db.customHabits = (db.customHabits || []).filter(h => h.id !== id);
  db.customHabitLogs = (db.customHabitLogs || []).filter(l => l.habit_id !== id);
  saveDatabase(db);

  broadcast({
    type: 'CUSTOM_HABIT_DELETED',
    payload: { id },
  });

  res.json({ success: true, id });
});

app.post('/api/custom-habit-logs', (req, res) => {
  const log = req.body;
  if (!log || !log.id) return res.status(400).json({ error: 'Invalid custom habit log' });

  const map = new Map((db.customHabitLogs || []).map(l => [l.id, l]));
  map.set(log.id, log);
  db.customHabitLogs = Array.from(map.values());
  saveDatabase(db);

  broadcast({
    type: 'CUSTOM_HABIT_LOG_UPDATED',
    payload: log,
  });

  res.json({ success: true, log });
});

// Sync push from client (Merges updates)
app.post('/api/sync/push', (req, res) => {
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

  saveDatabase(db);

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
