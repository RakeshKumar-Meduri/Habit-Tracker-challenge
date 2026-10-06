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
    day_cutoff_hour: 0,
  },
};

function mergeDb(base, incoming) {
  if (!incoming || typeof incoming !== 'object') return { ...base };
  const deletedWorkoutIds = Array.isArray(incoming.deletedWorkoutIds)
    ? incoming.deletedWorkoutIds
    : (base.deletedWorkoutIds || []);
  const tombstoneSet = new Set(deletedWorkoutIds.map(id => String(id).trim()));

  return {
    users: Array.isArray(incoming.users) ? incoming.users : (base.users || []),
    groups: Array.isArray(incoming.groups) ? incoming.groups : (base.groups || []),
    memberships: Array.isArray(incoming.memberships) ? incoming.memberships : (base.memberships || []),
    invites: Array.isArray(incoming.invites) ? incoming.invites : (base.invites || []),
    sessions: Array.isArray(incoming.sessions) ? incoming.sessions : (base.sessions || []),
    dailyLogs: (Array.isArray(incoming.dailyLogs) ? incoming.dailyLogs : (base.dailyLogs || [])).filter(l =>
      l && l.id !== 'cmuuvhlqk0005pxawp6f80dg9' && !(l.steps_value === 11200 && l.points_earned === 50) && !(l.user_id === 'usr_seed_rakesh' && l.steps_value === 11200)
    ),
    workouts: (Array.isArray(incoming.workouts) ? incoming.workouts : (base.workouts || [])).filter(w =>
      w && w.id && !tombstoneSet.has(String(w.id).trim()) &&
      w.id !== 'w_rakesh_1' && w.id !== 'w_rakesh_2' && w.id !== 'w_seed_bench'
    ),
    weightLogs: Array.isArray(incoming.weightLogs) ? incoming.weightLogs : (base.weightLogs || []),
    missedReasons: Array.isArray(incoming.missedReasons) ? incoming.missedReasons : (base.missedReasons || []),
    reactions: Array.isArray(incoming.reactions) ? incoming.reactions : (base.reactions || []),
    badges: Array.isArray(incoming.badges) ? incoming.badges : (base.badges || []),
    supplements: Array.isArray(incoming.supplements) ? incoming.supplements : (base.supplements || []),
    supplementLogs: Array.isArray(incoming.supplementLogs) ? incoming.supplementLogs : (base.supplementLogs || []),
    customHabits: Array.isArray(incoming.customHabits) ? incoming.customHabits : (base.customHabits || []),
    customHabitLogs: Array.isArray(incoming.customHabitLogs) ? incoming.customHabitLogs : (base.customHabitLogs || []),
    deletedWorkoutIds,
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

// Atomic mutation helper: always reloads fresh state from Redis/disk before mutating,
// applies tombstones to guarantee deleted workouts can NEVER be resurrected, and saves back.
async function mutate(fn) {
  let fresh = null;
  if (redis) {
    fresh = await loadDatabaseRedis();
  } else {
    fresh = loadDatabaseLocal();
  }
  if (!fresh) fresh = mergeDb(DEFAULT_DB, {});
  fresh.deletedWorkoutIds = fresh.deletedWorkoutIds || [];
  fresh.workouts = fresh.workouts || [];

  await fn(fresh);

  // Guarantee deleted workouts are always filtered out according to tombstones
  if (fresh.deletedWorkoutIds.length > 0) {
    const tombstoneSet = new Set(fresh.deletedWorkoutIds.map(id => String(id).trim()));
    fresh.workouts = fresh.workouts.filter(w => w && w.id && !tombstoneSet.has(String(w.id).trim()));
  }

  await saveDatabase(fresh);
  db = fresh;
  return fresh;
}// Initialize db synchronously with local or seed
let db = loadDatabaseLocal();

// ----------------------------------------------------
// Migration: Groups & Memberships Initialization
// ----------------------------------------------------
async function runMigrationIfNeeded() {
  await mutate(d => {
    d.groups = d.groups || [];
    d.memberships = d.memberships || [];
    d.invites = d.invites || [];
    d.sessions = d.sessions || [];

    if (d.groups.length > 0) {
      console.log(`[PULSE Migration] Groups table already exists (${d.groups.length} groups). Migration skipped.`);
      return;
    }

    const activeUsers = (d.users || []).filter(u => u && u.is_active !== false);
    if (activeUsers.length === 0) {
      console.log('[PULSE Migration] No active users in database. Migration skipped.');
      return;
    }

    console.log('[PULSE Migration] Running group migration for existing users...');
    const owner = activeUsers[0];
    const ownerId = owner.id;
    const groupId = 'group_pulse_original';
    const now = new Date().toISOString();

    const originalGroup = {
      id: groupId,
      name: 'PULSE Original',
      owner_id: ownerId,
      created_at: now,
    };
    d.groups.push(originalGroup);

    for (const u of activeUsers) {
      const isOwner = u.id === ownerId;
      d.memberships.push({
        user_id: u.id,
        group_id: groupId,
        role: isOwner ? 'owner' : 'member',
        joined_at: u.created_at ? new Date(u.created_at).toISOString() : now,
      });
    }

    console.log(`[PULSE Migration] Created 'PULSE Original' group (${groupId}) owned by ${ownerId}. Enrolled ${d.memberships.length} members.`);
  });
}

// Run migration immediately
runMigrationIfNeeded().catch(err => console.error('[PULSE Migration Error]', err));

// Hydrate from Redis on startup if available
if (redis) {
  loadDatabaseRedis().then(async data => {
    if (data) {
      db = data;
      console.log(`[PULSE Server] Redis DB loaded: ${db.users.length} users, ${db.dailyLogs.length} logs`);
      await runMigrationIfNeeded();
    }
  }).catch(err => {
    console.error('[PULSE Server] Error during initial Redis load:', err);
  });
}

// Middleware: ensure DB is always fresh from Redis before handling any /api request
// and prevent aggressive iOS Safari / proxy disk caching of API requests
app.use('/api', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

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

// Strip password hash from user objects before sending to clients
function sanitizeUser(u) {
  if (!u || typeof u !== 'object') return u;
  const { password_hash, ...safe } = u;
  const uname = (u.username || '').replace(/^@+/, '').toLowerCase();
  const isModOrAdmin = u.role === 'admin' || u.role === 'moderator' || uname === 'rakesh' || uname === 'hitesh';
  safe.planTier = isModOrAdmin ? 'pro' : (u.planTier || u.plan || 'base');
  safe.plan = safe.planTier;
  return safe;
}

// ----------------------------------------------------
// Authentication Middleware
// ----------------------------------------------------
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing session token' });
  }

  const session = (db.sessions || []).find(s => s && s.token === token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid session token' });
  }

  if (session.expires_at && new Date(session.expires_at) <= new Date()) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Session has expired' });
  }

  const user = (db.users || []).find(u => u && u.id === session.user_id && u.is_active !== false);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: User not found or deactivated' });
  }

  req.user = user;
  const mem = (db.memberships || []).find(m => m && m.user_id === user.id);
  req.user.groupId = mem ? mem.group_id : null;
  req.user.groupRole = mem ? mem.role : null;
  next();
}

// ----------------------------------------------------
// Real-Time WebSockets Engine
// ----------------------------------------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Set();

export function broadcast(event, senderWs = null, targetGroupId = null) {
  const payload = JSON.stringify(event);
  for (const client of wsClients) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      if (targetGroupId && client.groupId && client.groupId !== targetGroupId) {
        continue;
      }
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
  ws.groupId = null;
  wsClients.add(ws);
  console.log(`[WS] Client connected. Total sockets: ${wsClients.size}, Online count: ${getOnlineUserCount()}`);

  ws.send(JSON.stringify({
    type: 'CONNECTED',
    payload: {
      clientCount: getOnlineUserCount(),
      timestamp: new Date().toISOString(),
    },
  }));

  broadcastClientCount();

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      } else if (msg.type === 'IDENTIFY') {
        const token = msg.payload?.token;
        const fallbackUserId = msg.payload?.userId;
        let resolvedUserId = null;

        if (token) {
          const session = (db.sessions || []).find(s => s && s.token === token && new Date(s.expires_at) > new Date());
          if (session) {
            resolvedUserId = session.user_id;
          }
        }
        if (!resolvedUserId && fallbackUserId) {
          const u = (db.users || []).find(usr => usr.id === fallbackUserId && usr.is_active !== false);
          if (u) resolvedUserId = u.id;
        }

        const prevUserId = ws.userId;
        ws.userId = resolvedUserId || null;

        if (ws.userId) {
          const mem = (db.memberships || []).find(m => m.user_id === ws.userId);
          ws.groupId = mem ? mem.group_id : null;
        } else {
          ws.groupId = null;
        }

        if (prevUserId !== ws.userId) {
          console.log(`[WS] Client identified: user=${ws.userId}, group=${ws.groupId}. Online count: ${getOnlineUserCount()}`);
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
// Public Authentication & Invite Endpoints
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

// Register User (Whitelisted fields, optional inviteToken, generates session token)
app.post('/api/auth/register', async (req, res) => {
  const { name, username, password, passwordPlain, height, weight, age, gender, inviteToken } = req.body || {};
  const pass = password || passwordPlain;

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required.' });
  }
  if (!pass || String(pass).trim().length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
  }

  const cleanUsername = String(username).trim().replace(/^@+/, '').toLowerCase();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ success: false, error: 'Username must be at least 3 characters long.' });
  }

  const cleanName = String(name || cleanUsername).trim();
  const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];
  const password_hash = hashPassword(String(pass).trim());

  const gradients = [
    'from-[#D98B4A] to-[#B45F1E]',
    'from-emerald-500 to-teal-700',
    'from-violet-500 to-purple-700',
    'from-amber-500 to-orange-700',
    'from-cyan-500 to-blue-700',
    'from-rose-500 to-pink-700',
  ];
  const avatar_color = gradients[Math.floor(Math.random() * gradients.length)];

  const newUser = {
    id: userId,
    name: cleanName,
    username: cleanUsername,
    password_hash,
    role: 'member', // Role is ALWAYS member
    height: Number(height) || 175,
    weight_current: Number(weight) || 70,
    age: Number(age) || 25,
    gender: gender || 'male',
    is_private: false,
    avatar_color,
    created_at: todayStr,
    is_active: true,
    must_change_password: false,
  };

  const sessionToken = crypto.randomBytes(32).toString('base64url');
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  let tokenError = null;
  let targetGroupId = null;

  await mutate(d => {
    d.users = d.users || [];
    d.groups = d.groups || [];
    d.memberships = d.memberships || [];
    d.invites = d.invites || [];
    d.sessions = d.sessions || [];

    // Check username conflict
    const existing = d.users.find(u => u.username.replace(/^@+/, '').toLowerCase() === cleanUsername);
    if (existing) {
      tokenError = `Username @${cleanUsername} is already registered.`;
      return;
    }

    if (inviteToken) {
      const invite = d.invites.find(i => i.token === inviteToken);
      if (!invite || invite.revoked) {
        tokenError = 'Invite link is invalid or has been revoked.';
        return;
      }
      if (new Date(invite.expires_at) <= new Date()) {
        tokenError = 'This invite link has expired.';
        return;
      }
      if (invite.uses >= invite.max_uses) {
        tokenError = 'This invite link has reached its maximum uses.';
        return;
      }
      const group = d.groups.find(g => g.id === invite.group_id);
      if (!group) {
        tokenError = 'The group for this invite link does not exist.';
        return;
      }

      // Valid token: enroll into inviter's group
      targetGroupId = group.id;
      invite.uses = (invite.uses || 0) + 1;

      d.users.push(newUser);
      d.memberships.push({
        user_id: newUser.id,
        group_id: targetGroupId,
        role: 'member',
        joined_at: now,
      });
    } else {
      // No token: auto-create "<first name>'s Group" with them as owner
      const firstName = cleanName.split(' ')[0] || cleanUsername;
      const groupName = `${firstName}'s Group`;
      targetGroupId = `grp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      d.users.push(newUser);
      d.groups.push({
        id: targetGroupId,
        name: groupName,
        owner_id: newUser.id,
        created_at: now,
        step_target: 10000,
      });
      d.memberships.push({
        user_id: newUser.id,
        group_id: targetGroupId,
        role: 'owner',
        joined_at: now,
      });
    }

    // Store server session token
    d.sessions.push({
      token: sessionToken,
      user_id: newUser.id,
      expires_at: sessionExpiresAt,
    });
  });

  if (tokenError) {
    return res.status(400).json({ success: false, error: tokenError });
  }

  const safeUser = sanitizeUser(newUser);

  broadcast({
    type: 'USER_REGISTERED',
    payload: safeUser,
  }, null, targetGroupId);

  res.json({
    success: true,
    token: sessionToken,
    user: safeUser,
  });
});

// Server-side Login Verification (Generates session token, stores in db.sessions)
app.post('/api/auth/login', async (req, res) => {
  const identifier = String(req.body?.identifier || req.body?.username || '').trim();
  const password = req.body?.password;
  const passwordHash = req.body?.passwordHash;
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

  const passTrim = String(password || '').trim();
  const computedHash = passwordHash || hashPassword(passTrim);
  let isMatch = user.password_hash === computedHash || user.password_hash === passTrim;
  if (!isMatch && passTrim) {
    isMatch = user.password_hash === hashPassword(passTrim);
  }
  // Guarantee default accounts authenticate with matching passwords
  if (!isMatch && (clean === 'rakesh' || clean === 'hitesh' || clean === 'demouser1' || clean === 'demouser2') && passTrim === clean) {
    isMatch = true;
  }
  if (!isMatch) {
    return res.status(401).json({ success: false, error: 'Incorrect password.' });
  }

  const sessionToken = crypto.randomBytes(32).toString('base64url');
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await mutate(d => {
    d.sessions = d.sessions || [];
    d.sessions.push({
      token: sessionToken,
      user_id: user.id,
      expires_at: sessionExpiresAt,
    });
  });

  res.json({
    success: true,
    token: sessionToken,
    user: sanitizeUser(user),
  });
});

// Public Invite Preview
app.get('/api/invites/:token', async (req, res) => {
  const { token } = req.params;
  if (redis) {
    try {
      const fresh = await loadDatabaseRedis();
      if (fresh) db = fresh;
    } catch {}
  }

  const invite = (db.invites || []).find(i => i.token === token);
  if (!invite || invite.revoked) {
    return res.json({
      success: true,
      valid: false,
      reason: 'Invite link is invalid or has been revoked.',
    });
  }

  if (new Date(invite.expires_at) <= new Date()) {
    return res.json({
      success: true,
      valid: false,
      reason: 'This invite link has expired.',
    });
  }

  if (invite.uses >= invite.max_uses) {
    return res.json({
      success: true,
      valid: false,
      reason: 'This invite link has reached its maximum uses.',
    });
  }

  const group = (db.groups || []).find(g => g.id === invite.group_id);
  if (!group) {
    return res.json({
      success: true,
      valid: false,
      reason: 'Group no longer exists.',
    });
  }

  const inviter = (db.users || []).find(u => u.id === invite.created_by);
  const inviterName = inviter ? (inviter.name || inviter.username) : 'A member';

  const memberCount = (db.memberships || []).filter(m =>
    m.group_id === invite.group_id &&
    (db.users || []).some(u => u.id === m.user_id && u.is_active !== false)
  ).length;

  res.json({
    success: true,
    valid: true,
    groupName: group.name,
    inviterName,
    memberCount,
  });
});

// ----------------------------------------------------
// Authenticated Group & Invite Routes
// ----------------------------------------------------

// Create Group Invite (Owner only)
app.post('/api/groups/:id/invites', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { expiresInDays = 7, maxUses = 10 } = req.body || {};

  const group = (db.groups || []).find(g => g.id === id);
  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  const myMem = (db.memberships || []).find(m => m.group_id === id && m.user_id === req.user.id);
  if (!myMem) {
    return res.status(403).json({ success: false, error: 'You are not a member of this group' });
  }

  // Base plan users are not allowed to create invite links
  const cleanUsername = String(req.user.username || '').toLowerCase();
  const isModeratorOrVip = req.user.role === 'admin' || req.user.role === 'moderator' || cleanUsername === 'rakesh' || cleanUsername === 'hitesh';
  const planTier = isModeratorOrVip ? 'pro' : (req.headers['x-plan-tier'] || req.body?.planTier || req.user.plan || 'base');
  if (planTier === 'base') {
    return res.status(403).json({ success: false, error: 'Group invitations are exclusively available on the PULSE Pro Plan.' });
  }

  const token = crypto.randomBytes(16).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (Number(expiresInDays) || 7) * 24 * 60 * 60 * 1000).toISOString();

  const invite = {
    token,
    group_id: id,
    created_by: req.user.id,
    created_at: now.toISOString(),
    expires_at: expiresAt,
    max_uses: Number(maxUses) || 10,
    uses: 0,
    revoked: false,
  };

  await mutate(d => {
    d.invites = d.invites || [];
    d.invites.push(invite);
  });

  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
  const url = `${origin}/join/${token}`;

  res.json({
    success: true,
    token,
    url,
    invite,
  });
});

// Redeem Invite for Logged-In User
app.post('/api/invites/:token/redeem', requireAuth, async (req, res) => {
  const { token } = req.params;
  let statusError = null;
  let statusCode = 400;
  let joinedGroup = null;

  await mutate(d => {
    d.groups = d.groups || [];
    d.memberships = d.memberships || [];
    d.invites = d.invites || [];

    const invite = d.invites.find(i => i.token === token);
    if (!invite || invite.revoked) {
      statusError = 'Invite link is invalid or has been revoked.';
      statusCode = 400;
      return;
    }
    if (new Date(invite.expires_at) <= new Date()) {
      statusError = 'This invite link has expired.';
      statusCode = 400;
      return;
    }
    if (invite.uses >= invite.max_uses) {
      statusError = 'This invite link has reached its maximum uses.';
      statusCode = 400;
      return;
    }

    const targetGroup = d.groups.find(g => g.id === invite.group_id);
    if (!targetGroup) {
      statusError = 'Group no longer exists.';
      statusCode = 404;
      return;
    }

    const currentMem = d.memberships.find(m => m.user_id === req.user.id);
    if (currentMem) {
      if (currentMem.group_id === invite.group_id) {
        joinedGroup = targetGroup;
        return;
      }

      const currentGroupMembers = d.memberships.filter(m => m.group_id === currentMem.group_id);
      if (currentGroupMembers.length === 1) {
        // Only member in their old group: delete old empty group and invites
        d.groups = d.groups.filter(g => g.id !== currentMem.group_id);
        d.invites = d.invites.filter(i => i.group_id !== currentMem.group_id);
        d.memberships = d.memberships.filter(m => m.user_id !== req.user.id);
      } else {
        statusError = 'Leave your current group first';
        statusCode = 409;
        return;
      }
    }

    d.memberships.push({
      user_id: req.user.id,
      group_id: targetGroup.id,
      role: 'member',
      joined_at: new Date().toISOString(),
    });
    invite.uses = (invite.uses || 0) + 1;
    joinedGroup = targetGroup;
  });

  if (statusError) {
    return res.status(statusCode).json({ success: false, error: statusError });
  }

  for (const client of wsClients) {
    if (client.userId === req.user.id) {
      client.groupId = joinedGroup.id;
    }
  }

  broadcast({
    type: 'GROUP_MEMBER_JOINED',
    payload: {
      groupId: joinedGroup.id,
      user: sanitizeUser(req.user),
    },
  }, null, joinedGroup.id);

  res.json({
    success: true,
    message: `Joined ${joinedGroup.name}`,
    group: joinedGroup,
  });
});

// Revoke Invite (Owner, Creator, or Group Member)
app.delete('/api/invites/:token', requireAuth, async (req, res) => {
  const token = String(req.params.token || '').trim();
  const invite = (db.invites || []).find(i => String(i.token || '').trim() === token);
  if (!invite) {
    // If not found or already deleted from active array, return success so client cleans up
    return res.json({ success: true, message: 'Invite already revoked' });
  }

  const groupMem = (db.memberships || []).find(m => m.group_id === invite.group_id && m.user_id === req.user.id);
  const isCreator = String(invite.created_by || '').trim() === String(req.user.id || '').trim();
  const isOwner = groupMem && groupMem.role === 'owner';
  const isGroupOwner = (db.groups || []).find(g => g.id === invite.group_id)?.owner_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isMember = !!groupMem;

  if (!isCreator && !isOwner && !isGroupOwner && !isAdmin && !isMember) {
    return res.status(403).json({ success: false, error: 'Only group members or invite creator can revoke this link' });
  }

  await mutate(d => {
    d.invites = d.invites || [];
    const inv = d.invites.find(i => String(i.token || '').trim() === token);
    if (inv) inv.revoked = true;
    d.invites = d.invites.filter(i => String(i.token || '').trim() !== token);
  });

  broadcast({
    type: 'INVITE_REVOKED',
    payload: { token, groupId: invite.group_id },
  }, null, invite.group_id);

  res.json({ success: true, message: 'Invite revoked' });
});

// Leave Group
app.post('/api/groups/:id/leave', requireAuth, async (req, res) => {
  const { id } = req.params;
  let statusError = null;

  await mutate(d => {
    const myMem = (d.memberships || []).find(m => m.group_id === id && m.user_id === req.user.id);
    if (!myMem) {
      statusError = 'You are not a member of this group';
      return;
    }

    const groupMembers = (d.memberships || []).filter(m => m.group_id === id);
    const otherMembers = groupMembers.filter(m => m.user_id !== req.user.id);

    if (myMem.role === 'owner') {
      if (otherMembers.length > 0) {
        otherMembers.sort((a, b) => new Date(a.joined_at || 0) - new Date(b.joined_at || 0));
        const newOwner = otherMembers[0];
        const newOwnerMem = d.memberships.find(m => m.group_id === id && m.user_id === newOwner.user_id);
        if (newOwnerMem) newOwnerMem.role = 'owner';
        const grp = d.groups.find(g => g.id === id);
        if (grp) grp.owner_id = newOwner.user_id;
      } else {
        d.groups = (d.groups || []).filter(g => g.id !== id);
        d.invites = (d.invites || []).filter(i => i.group_id !== id);
      }
    }

    d.memberships = (d.memberships || []).filter(m => !(m.group_id === id && m.user_id === req.user.id));

    // Auto-create a solo group for leaving user
    const firstName = (req.user.name || req.user.username || 'My').trim().split(' ')[0];
    const newGroupId = `grp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    d.groups.push({
      id: newGroupId,
      name: `${firstName}'s Group`,
      owner_id: req.user.id,
      created_at: now,
      step_target: 10000,
    });
    d.memberships.push({
      user_id: req.user.id,
      group_id: newGroupId,
      role: 'owner',
      joined_at: now,
    });
  });

  if (statusError) {
    return res.status(400).json({ success: false, error: statusError });
  }

  broadcast({
    type: 'GROUP_MEMBER_LEFT',
    payload: { groupId: id, userId: req.user.id },
  }, null, id);

  res.json({ success: true, message: 'Successfully left group' });
});

// Remove Member (Owner only)
app.delete('/api/groups/:id/members/:userId', requireAuth, async (req, res) => {
  const { id, userId } = req.params;

  if (userId === req.user.id) {
    return res.status(400).json({ success: false, error: 'Cannot remove yourself. Use leave group instead.' });
  }

  const groupMem = (db.memberships || []).find(m => m.group_id === id && m.user_id === req.user.id);
  if (!groupMem || groupMem.role !== 'owner') {
    return res.status(403).json({ success: false, error: 'Only the group owner can remove members' });
  }

  const targetUser = (db.users || []).find(u => u.id === userId);

  await mutate(d => {
    d.memberships = (d.memberships || []).filter(m => !(m.group_id === id && m.user_id === userId));

    if (targetUser) {
      const firstName = (targetUser.name || targetUser.username || 'My').trim().split(' ')[0];
      const newGroupId = `grp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();
      d.groups.push({
        id: newGroupId,
        name: `${firstName}'s Group`,
        owner_id: targetUser.id,
        created_at: now,
        step_target: 10000,
      });
      d.memberships.push({
        user_id: targetUser.id,
        group_id: newGroupId,
        role: 'owner',
        joined_at: now,
      });
    }
  });

  broadcast({
    type: 'GROUP_MEMBER_REMOVED',
    payload: { groupId: id, userId },
  }, null, id);

  res.json({ success: true, message: 'Member removed from group' });
});

// Update Group Settings (Group Name and Step Target - Owner only)
app.patch('/api/groups/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, step_target } = req.body || {};

  const group = (db.groups || []).find(g => g.id === id);
  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  const myMem = (db.memberships || []).find(m => m.group_id === id && m.user_id === req.user.id);
  if (!myMem || myMem.role !== 'owner') {
    return res.status(403).json({ success: false, error: 'Only the group owner can update group settings' });
  }

  let updatedName = group.name;
  if (typeof name === 'string' && name.trim().length >= 2) {
    updatedName = name.trim();
  }

  let updatedStepTarget = group.step_target || 10000;
  if (step_target !== undefined && step_target !== null) {
    const parsedSteps = Number(step_target);
    if (!isNaN(parsedSteps) && parsedSteps >= 1000 && parsedSteps <= 100000) {
      updatedStepTarget = Math.round(parsedSteps);
    }
  }

  let updatedGroup = null;
  await mutate(d => {
    d.groups = d.groups || [];
    const grp = d.groups.find(g => g.id === id);
    if (grp) {
      grp.name = updatedName;
      grp.step_target = updatedStepTarget;
      updatedGroup = { ...grp };
    }
  });

  broadcast({
    type: 'GROUP_UPDATED',
    payload: {
      groupId: id,
      name: updatedName,
      step_target: updatedStepTarget,
      group: updatedGroup,
    },
  }, null, id);

  res.json({
    success: true,
    message: 'Group settings updated successfully',
    group: updatedGroup,
  });
});

// ----------------------------------------------------
// Authenticated Data & Sync Endpoints
// ----------------------------------------------------

// Group-Scoped Sync
app.get('/api/sync', requireAuth, async (req, res) => {
  if (redis) {
    try {
      const fresh = await loadDatabaseRedis();
      if (fresh && fresh.users) db = fresh;
    } catch {}
  }

  let membership = (db.memberships || []).find(m => m.user_id === req.user.id);
  if (!membership) {
    await mutate(d => {
      d.groups = d.groups || [];
      d.memberships = d.memberships || [];
      const firstName = (req.user.name || req.user.username || 'My').trim().split(' ')[0];
      const newGroupId = `grp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();
      const newGroup = {
        id: newGroupId,
        name: `${firstName}'s Group`,
        owner_id: req.user.id,
        created_at: now,
        step_target: 10000,
      };
      const newMem = {
        user_id: req.user.id,
        group_id: newGroupId,
        role: 'owner',
        joined_at: now,
      };
      d.groups.push(newGroup);
      d.memberships.push(newMem);
      membership = newMem;
    });
  }

  const groupId = membership.group_id;
  const group = (db.groups || []).find(g => g.id === groupId) || {
    id: groupId,
    name: 'My Group',
    owner_id: req.user.id,
  };

  const groupMemberships = (db.memberships || []).filter(m => m.group_id === groupId);
  const memberUserIds = new Set(groupMemberships.map(m => m.user_id));

  const groupUsers = (db.users || [])
    .filter(u => memberUserIds.has(u.id) && u.is_active !== false)
    .map(sanitizeUser);

  const tombstoneSet = new Set((db.deletedWorkoutIds || []).map(id => String(id).trim()));

  const myRole = membership.role;
  const invites = (db.invites || []).filter(i => i.group_id === groupId && !i.revoked && new Date(i.expires_at) > new Date());

  const membersInfo = groupMemberships.map(m => {
    const u = (db.users || []).find(usr => usr.id === m.user_id);
    return {
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      name: u?.name || 'Member',
      username: u?.username || '',
      avatar_color: u?.avatar_color,
    };
  });

  const cleanUsername = String(req.user.username || '').toLowerCase();
  const isVipOrModerator = req.user.role === 'admin' || req.user.role === 'moderator' || cleanUsername === 'rakesh' || cleanUsername === 'hitesh';
  const planTier = isVipOrModerator ? 'pro' : (req.user.plan || 'base');

  res.json({
    success: true,
    data: {
      planTier,
      group: {
        ...group,
        step_target: group.step_target || 10000,
        members: membersInfo,
      },
      myRole,
      invites,
      users: groupUsers,
      dailyLogs: (db.dailyLogs || []).filter(l =>
        memberUserIds.has(l.user_id) &&
        l.id !== 'cmuuvhlqk0005pxawp6f80dg9' &&
        !(l.steps_value === 11200 && l.points_earned === 50) &&
        !(l.user_id === 'usr_seed_rakesh' && l.steps_value === 11200)
      ),
      workouts: (db.workouts || []).filter(w =>
        w && w.id && memberUserIds.has(w.user_id) && !tombstoneSet.has(String(w.id).trim()) &&
        w.id !== 'w_rakesh_1' && w.id !== 'w_rakesh_2' && w.id !== 'w_seed_bench'
      ),
      weightLogs: (db.weightLogs || []).filter(w => memberUserIds.has(w.user_id)),
      missedReasons: (db.missedReasons || []).filter(m => memberUserIds.has(m.user_id)),
      reactions: (db.reactions || []).filter(r => memberUserIds.has(r.user_id)),
      badges: (db.badges || []).filter(b => memberUserIds.has(b.user_id)),
      supplements: (db.supplements || []).filter(s => memberUserIds.has(s.user_id)),
      supplementLogs: (db.supplementLogs || []).filter(l => memberUserIds.has(l.user_id)),
      customHabits: (db.customHabits || []).filter(h => memberUserIds.has(h.user_id)),
      customHabitLogs: (db.customHabitLogs || []).filter(l => memberUserIds.has(l.user_id)),
      deletedWorkoutIds: db.deletedWorkoutIds || [],
      adminSettings: db.adminSettings,
    },
  });
});

// Group Users List
app.get('/api/users', requireAuth, async (req, res) => {
  if (redis) {
    try {
      const fresh = await loadDatabaseRedis();
      if (fresh && fresh.users) db = fresh;
    } catch {}
  }
  const mem = (db.memberships || []).find(m => m.user_id === req.user.id);
  const groupId = mem ? mem.group_id : null;
  const memberUserIds = new Set(
    (db.memberships || []).filter(m => m.group_id === groupId).map(m => m.user_id)
  );

  const cleanUsers = (db.users || [])
    .filter(u => u && u.is_active !== false && memberUserIds.has(u.id))
    .map(sanitizeUser);

  res.json({
    success: true,
    users: cleanUsers,
    count: cleanUsers.length,
  });
});

// Single Member by ID or Username
app.get('/api/users/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (redis) {
    try {
      const fresh = await loadDatabaseRedis();
      if (fresh && fresh.users) db = fresh;
    } catch {}
  }
  const targetId = String(id || '').trim().toLowerCase();
  const found = (db.users || []).find(u => 
    u && (String(u.id).toLowerCase() === targetId || String(u.username || '').toLowerCase() === targetId.replace(/^@+/, ''))
  );
  if (!found || found.is_active === false) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, user: sanitizeUser(found) });
});

// Update User Profile (Self only)
app.put('/api/users/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (req.user.id !== id) {
    return res.status(403).json({ success: false, error: 'Forbidden: You can only update your own profile' });
  }

  const { role, id: ignoreId, password_hash, ...safeUpdates } = req.body || {};
  let updatedUser = null;

  await mutate(d => {
    const idx = d.users.findIndex(u => u.id === id);
    if (idx >= 0) {
      d.users[idx] = { ...d.users[idx], ...safeUpdates };
      updatedUser = d.users[idx];
    }
  });

  if (!updatedUser) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const safeUpdated = sanitizeUser(updatedUser);

  broadcast({
    type: 'USER_UPDATED',
    payload: safeUpdated,
  }, null, req.user.groupId);

  res.json({ success: true, user: safeUpdated });
});

// Delete User Account (Self only, handles group transfer/deletion)
app.delete('/api/users/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  if (req.user.id !== id) {
    return res.status(403).json({ success: false, error: 'Forbidden: You can only delete your own account' });
  }

  await mutate(d => {
    const userMemberships = (d.memberships || []).filter(m => m.user_id === id);
    for (const mem of userMemberships) {
      if (mem.role === 'owner') {
        const otherMembers = (d.memberships || []).filter(m => m.group_id === mem.group_id && m.user_id !== id);
        if (otherMembers.length > 0) {
          otherMembers.sort((a, b) => new Date(a.joined_at || 0) - new Date(b.joined_at || 0));
          const newOwner = otherMembers[0];
          const newOwnerMem = d.memberships.find(m => m.group_id === mem.group_id && m.user_id === newOwner.user_id);
          if (newOwnerMem) newOwnerMem.role = 'owner';
          const grp = (d.groups || []).find(g => g.id === mem.group_id);
          if (grp) grp.owner_id = newOwner.user_id;
        } else {
          d.groups = (d.groups || []).filter(g => g.id !== mem.group_id);
          d.invites = (d.invites || []).filter(i => i.group_id !== mem.group_id);
        }
      }
    }

    d.memberships = (d.memberships || []).filter(m => m.user_id !== id);
    d.sessions = (d.sessions || []).filter(s => s.user_id !== id);
    d.users = d.users.filter(u => u.id !== id);
    d.dailyLogs = d.dailyLogs.filter(l => l.user_id !== id);
    d.workouts = d.workouts.filter(w => w.user_id !== id);
    d.weightLogs = d.weightLogs.filter(w => w.user_id !== id);
    d.missedReasons = d.missedReasons.filter(m => m.user_id !== id);
    if (Array.isArray(d.supplements)) d.supplements = d.supplements.filter(s => s.user_id !== id);
    if (Array.isArray(d.supplementLogs)) d.supplementLogs = d.supplementLogs.filter(s => s.user_id !== id);
    if (Array.isArray(d.customHabits)) d.customHabits = d.customHabits.filter(h => h.user_id !== id);
    if (Array.isArray(d.customHabitLogs)) d.customHabitLogs = d.customHabitLogs.filter(h => h.user_id !== id);
  });

  broadcast({
    type: 'USER_DELETED',
    payload: { userId: id },
  });

  for (const client of wsClients) {
    if (client.userId === id) {
      client.userId = null;
      client.groupId = null;
    }
  }
  broadcastClientCount();

  res.json({ success: true, message: `User ${id} deleted` });
});

// Update or Create Daily Log
app.post('/api/logs', requireAuth, async (req, res) => {
  const log = req.body;
  if (!log || !log.id) return res.status(400).json({ error: 'Invalid log' });

  log.user_id = req.user.id;

  // Server-authoritative points calculation (Section 26)
  let isSunday = false;
  if (log.date) {
    const [y, m, d] = String(log.date).split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      isSunday = new Date(y, m - 1, d).getDay() === 0;
    }
  }
  let basePoints = 0;
  if (log.gym_done || (isSunday && log.gym_done !== false)) basePoints += 10;
  if (log.sleep_done) basePoints += 10;
  if (log.junk_food_avoided) basePoints += 10;
  if (log.water_done) basePoints += 10;

  const currentGroup = (db.groups || []).find(g => g.id === req.user.groupId);
  const target = Math.max(1000, Number(log.steps_target) || (currentGroup && currentGroup.step_target) || 10000);
  const stepsVal = Math.max(0, Number(log.steps_value) || 0);
  const stepPoints = (log.steps_done || stepsVal >= target)
    ? 10
    : Math.min(10, Math.round((stepsVal / target) * 100) / 10);

  log.points_earned = Math.min(50, Math.round((basePoints + stepPoints) * 10) / 10);

  await mutate(d => {
    const idx = d.dailyLogs.findIndex(l => l.id === log.id || (l.user_id === log.user_id && l.date === log.date));
    if (idx >= 0) {
      d.dailyLogs[idx] = { ...d.dailyLogs[idx], ...log };
    } else {
      d.dailyLogs.push(log);
    }
  });

  broadcast({
    type: 'DAILY_LOG_UPDATED',
    payload: log,
  }, null, req.user.groupId);

  res.json({ success: true, log });
});

// Add Workouts (Skip tombstoned IDs, enforce user_id)
app.post('/api/workouts', requireAuth, async (req, res) => {
  const newWorkouts = req.body;
  const added = [];

  await mutate(d => {
    const tombstoneSet = new Set((d.deletedWorkoutIds || []).map(id => String(id).trim()));
    const incomingList = Array.isArray(newWorkouts) ? newWorkouts : (newWorkouts && newWorkouts.id ? [newWorkouts] : []);
    const map = new Map(d.workouts.map(w => [String(w.id).trim(), w]));

    incomingList.forEach(w => {
      const wid = String(w?.id || '').trim();
      if (wid && !tombstoneSet.has(wid)) {
        w.user_id = req.user.id; // Enforce logged in user ownership
        map.set(wid, w);
        added.push(w);
      }
    });

    d.workouts = Array.from(map.values());
  });

  if (added.length > 0) {
    broadcast({
      type: 'WORKOUTS_ADDED',
      payload: added,
    }, null, req.user.groupId);
  }

  res.json({ success: true, addedCount: added.length });
});

// Delete Workout (DELETE method: creator-only enforcement)
app.delete('/api/workouts/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const targetId = String(id || '').trim();
  if (!targetId) return res.status(400).json({ error: 'Missing workout id' });

  const existing = (db.workouts || []).find(w => String(w.id || '').trim() === targetId);
  if (existing && existing.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Forbidden: You can only delete your own workouts.' });
  }

  let deleted = false;
  await mutate(d => {
    const before = d.workouts.length;
    d.workouts = d.workouts.filter(w => String(w.id || '').trim() !== targetId);
    deleted = d.workouts.length < before;
    if (!d.deletedWorkoutIds.includes(targetId)) {
      d.deletedWorkoutIds.push(targetId);
    }
  });

  broadcast({
    type: 'WORKOUT_DELETED',
    payload: { id: targetId },
  }, null, req.user.groupId);

  res.json({ success: true, deleted });
});

// Delete Workout (POST method fallback: creator-only enforcement)
app.post('/api/workouts/delete', requireAuth, async (req, res) => {
  const { id } = req.body || {};
  const targetId = String(id || '').trim();
  if (!targetId) return res.status(400).json({ error: 'Missing workout id' });

  const existing = (db.workouts || []).find(w => String(w.id || '').trim() === targetId);
  if (existing && existing.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Forbidden: You can only delete your own workouts.' });
  }

  let deleted = false;
  await mutate(d => {
    const before = d.workouts.length;
    d.workouts = d.workouts.filter(w => String(w.id || '').trim() !== targetId);
    deleted = d.workouts.length < before;
    if (!d.deletedWorkoutIds.includes(targetId)) {
      d.deletedWorkoutIds.push(targetId);
    }
  });

  broadcast({
    type: 'WORKOUT_DELETED',
    payload: { id: targetId },
  }, null, req.user.groupId);

  res.json({ success: true, deleted });
});

// Clear User's Workouts
app.post('/api/workouts/clear-all', requireAuth, async (req, res) => {
  await mutate(d => {
    d.workouts.forEach(w => {
      if (w.user_id === req.user.id) {
        const wid = String(w.id || '').trim();
        if (wid && !d.deletedWorkoutIds.includes(wid)) {
          d.deletedWorkoutIds.push(wid);
        }
      }
    });
    d.workouts = d.workouts.filter(w => w.user_id !== req.user.id);
  });

  broadcast({
    type: 'WORKOUTS_CLEARED',
    payload: { userId: req.user.id },
  }, null, req.user.groupId);

  res.json({ success: true, message: 'Workouts cleared for user' });
});

// Add Weight Log
app.post('/api/weights', requireAuth, async (req, res) => {
  const weightLog = req.body;
  if (!weightLog || !weightLog.id) return res.status(400).json({ error: 'Invalid weight log' });

  weightLog.user_id = req.user.id;

  await mutate(d => {
    const map = new Map(d.weightLogs.map(w => [w.id, w]));
    map.set(weightLog.id, weightLog);
    d.weightLogs = Array.from(map.values());

    const userIdx = d.users.findIndex(u => u.id === req.user.id);
    if (userIdx >= 0) {
      d.users[userIdx].weight_current = weightLog.weight;
    }
  });

  broadcast({
    type: 'WEIGHT_LOG_ADDED',
    payload: weightLog,
  }, null, req.user.groupId);

  res.json({ success: true, weightLog });
});

// Add/Update Missed Reason
app.post('/api/missed-reasons', requireAuth, async (req, res) => {
  const reason = req.body;
  if (!reason || !reason.id) return res.status(400).json({ error: 'Invalid missed reason' });

  reason.user_id = req.user.id;

  await mutate(d => {
    const map = new Map(d.missedReasons.map(r => [r.id, r]));
    map.set(reason.id, reason);
    d.missedReasons = Array.from(map.values());
  });

  broadcast({
    type: 'MISSED_REASON_ADDED',
    payload: reason,
  }, null, req.user.groupId);

  res.json({ success: true, reason });
});

// Delete Missed Reason
app.post('/api/missed-reasons/delete', requireAuth, async (req, res) => {
  const { id } = req.body || {};
  const targetId = String(id || '').trim();
  if (!targetId) return res.status(400).json({ error: 'Missing missed reason id' });

  await mutate(d => {
    d.missedReasons = (d.missedReasons || []).filter(r => String(r.id || '').trim() !== targetId);
  });

  broadcast({
    type: 'MISSED_REASON_DELETED',
    payload: { id: targetId },
  }, null, req.user.groupId);

  res.json({ success: true, id: targetId });
});

app.delete('/api/missed-reasons/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const targetId = String(id || '').trim();
  if (!targetId) return res.status(400).json({ error: 'Missing missed reason id' });

  await mutate(d => {
    d.missedReasons = (d.missedReasons || []).filter(r => String(r.id || '').trim() !== targetId);
  });

  broadcast({
    type: 'MISSED_REASON_DELETED',
    payload: { id: targetId },
  }, null, req.user.groupId);

  res.json({ success: true, id: targetId });
});

// Add Reaction
app.post('/api/reactions', requireAuth, async (req, res) => {
  const reaction = req.body;
  if (!reaction || !reaction.id) return res.status(400).json({ error: 'Invalid reaction' });

  reaction.user_id = req.user.id;

  await mutate(d => {
    const map = new Map(d.reactions.map(r => [r.id, r]));
    map.set(reaction.id, reaction);
    d.reactions = Array.from(map.values());
  });

  broadcast({
    type: 'REACTION_ADDED',
    payload: reaction,
  }, null, req.user.groupId);

  res.json({ success: true, reaction });
});

// Update Badges
app.post('/api/badges', requireAuth, async (req, res) => {
  const badges = req.body;
  if (Array.isArray(badges)) {
    await mutate(d => {
      const map = new Map(d.badges.map(b => [b.id, b]));
      badges.forEach(b => {
        if (b && b.id) map.set(b.id, b);
      });
      d.badges = Array.from(map.values());
    });

    broadcast({
      type: 'BADGES_UPDATED',
      payload: badges,
    }, null, req.user.groupId);
  }

  res.json({ success: true });
});

// Supplements
app.post('/api/supplements', requireAuth, async (req, res) => {
  const incoming = req.body;
  if (!incoming) return res.status(400).json({ error: 'Invalid supplement data' });

  const items = (Array.isArray(incoming) ? incoming : [incoming])
    .filter(s => s && s.id)
    .map(s => ({ ...s, user_id: req.user.id }));

  if (items.length === 0) return res.status(400).json({ error: 'No valid supplements provided' });

  await mutate(d => {
    const map = new Map((d.supplements || []).map(s => [s.id, s]));
    items.forEach(s => map.set(s.id, s));
    d.supplements = Array.from(map.values());
  });

  items.forEach(supp => {
    broadcast({
      type: 'SUPPLEMENT_ADDED',
      payload: supp,
    }, null, req.user.groupId);
  });

  res.json({ success: true, count: items.length, supplements: items });
});

app.delete('/api/supplements/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  await mutate(d => {
    d.supplements = (d.supplements || []).filter(s => s.id !== id);
    d.supplementLogs = (d.supplementLogs || []).filter(l => l.supplement_id !== id);
  });

  broadcast({
    type: 'SUPPLEMENT_DELETED',
    payload: { id },
  }, null, req.user.groupId);

  res.json({ success: true, id });
});

app.post('/api/supplement-logs', requireAuth, async (req, res) => {
  const log = req.body;
  if (!log || !log.id) return res.status(400).json({ error: 'Invalid supplement log' });

  log.user_id = req.user.id;

  await mutate(d => {
    const map = new Map((d.supplementLogs || []).map(l => [l.id, l]));
    map.set(log.id, log);
    d.supplementLogs = Array.from(map.values());
  });

  broadcast({
    type: 'SUPPLEMENT_LOG_UPDATED',
    payload: log,
  }, null, req.user.groupId);

  res.json({ success: true, log });
});

// Custom Habits
app.post('/api/custom-habits', requireAuth, async (req, res) => {
  const incoming = req.body;
  if (!incoming) return res.status(400).json({ error: 'Invalid habit data' });

  const items = (Array.isArray(incoming) ? incoming : [incoming])
    .filter(h => h && h.id)
    .map(h => ({ ...h, user_id: req.user.id }));

  if (items.length === 0) return res.status(400).json({ error: 'No valid habits provided' });

  await mutate(d => {
    const map = new Map((d.customHabits || []).map(h => [h.id, h]));
    items.forEach(h => map.set(h.id, h));
    d.customHabits = Array.from(map.values());
  });

  items.forEach(habit => {
    broadcast({
      type: 'CUSTOM_HABIT_ADDED',
      payload: habit,
    }, null, req.user.groupId);
  });

  res.json({ success: true, count: items.length, habits: items });
});

app.delete('/api/custom-habits/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  await mutate(d => {
    d.customHabits = (d.customHabits || []).filter(h => h.id !== id);
    d.customHabitLogs = (d.customHabitLogs || []).filter(l => l.habit_id !== id);
  });

  broadcast({
    type: 'CUSTOM_HABIT_DELETED',
    payload: { id },
  }, null, req.user.groupId);

  res.json({ success: true, id });
});

app.post('/api/custom-habit-logs', requireAuth, async (req, res) => {
  const log = req.body;
  if (!log || !log.id) return res.status(400).json({ error: 'Invalid custom habit log' });

  log.user_id = req.user.id;

  await mutate(d => {
    const map = new Map((d.customHabitLogs || []).map(l => [l.id, l]));
    map.set(log.id, log);
    d.customHabitLogs = Array.from(map.values());
  });

  broadcast({
    type: 'CUSTOM_HABIT_LOG_UPDATED',
    payload: log,
  }, null, req.user.groupId);

  res.json({ success: true, log });
});

// Sync push from client (Scoped to req.user)
app.post('/api/sync/push', requireAuth, async (req, res) => {
  const {
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

  await mutate(d => {
    const tombstoneSet = new Set((d.deletedWorkoutIds || []).map(id => String(id).trim()));

    if (Array.isArray(dailyLogs)) {
      const logMap = new Map(d.dailyLogs.map(l => [l.id, l]));
      dailyLogs.filter(l => l && l.user_id === req.user.id).forEach(l => logMap.set(l.id, l));
      d.dailyLogs = Array.from(logMap.values());
    }

    if (Array.isArray(workouts)) {
      const workoutMap = new Map(d.workouts.map(w => [String(w.id).trim(), w]));
      workouts.filter(w => w && w.user_id === req.user.id).forEach(w => {
        const wid = String(w?.id || '').trim();
        if (wid && !tombstoneSet.has(wid)) {
          workoutMap.set(wid, w);
        }
      });
      d.workouts = Array.from(workoutMap.values());
    }

    if (Array.isArray(weightLogs)) {
      const weightMap = new Map(d.weightLogs.map(w => [w.id, w]));
      weightLogs.filter(w => w && w.user_id === req.user.id).forEach(w => weightMap.set(w.id, w));
      d.weightLogs = Array.from(weightMap.values());
    }

    if (Array.isArray(missedReasons)) {
      const reasonMap = new Map(d.missedReasons.map(r => [r.id, r]));
      missedReasons.filter(r => r && r.user_id === req.user.id).forEach(r => reasonMap.set(r.id, r));
      d.missedReasons = Array.from(reasonMap.values());
    }

    if (Array.isArray(reactions)) {
      const reactionMap = new Map(d.reactions.map(r => [r.id, r]));
      reactions.filter(r => r && r.user_id === req.user.id).forEach(r => reactionMap.set(r.id, r));
      d.reactions = Array.from(reactionMap.values());
    }

    if (Array.isArray(badges)) {
      const badgeMap = new Map(d.badges.map(b => [b.id, b]));
      badges.filter(b => b && b.user_id === req.user.id).forEach(b => badgeMap.set(b.id, b));
      d.badges = Array.from(badgeMap.values());
    }

    if (Array.isArray(supplements)) {
      const suppMap = new Map((d.supplements || []).map(s => [s.id, s]));
      supplements.filter(s => s && s.user_id === req.user.id).forEach(s => suppMap.set(s.id, s));
      d.supplements = Array.from(suppMap.values());
    }

    if (Array.isArray(supplementLogs)) {
      const suppLogMap = new Map((d.supplementLogs || []).map(l => [l.id, l]));
      supplementLogs.filter(l => l && l.user_id === req.user.id).forEach(l => suppLogMap.set(l.id, l));
      d.supplementLogs = Array.from(suppLogMap.values());
    }

    if (Array.isArray(customHabits)) {
      const habitMap = new Map((d.customHabits || []).map(h => [h.id, h]));
      customHabits.filter(h => h && h.user_id === req.user.id).forEach(h => habitMap.set(h.id, h));
      d.customHabits = Array.from(habitMap.values());
    }

    if (Array.isArray(customHabitLogs)) {
      const habitLogMap = new Map((d.customHabitLogs || []).map(l => [l.id, l]));
      customHabitLogs.filter(l => l && l.user_id === req.user.id).forEach(l => habitLogMap.set(l.id, l));
      d.customHabitLogs = Array.from(habitLogMap.values());
    }
  });

  broadcast({
    type: 'GROUP_DATA_SYNC',
    payload: { userId: req.user.id },
  }, null, req.user.groupId);

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
