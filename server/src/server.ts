import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import { ENV } from './config/env';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { initWebSocketServer } from './websocket/websocket.server';

// Import modular routes
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import groupsRoutes from './routes/groups.routes';
import invitesRoutes from './routes/invites.routes';
import syncRoutes from './routes/sync.routes';
import usersRoutes from './routes/users.routes';
import logsRoutes from './routes/logs.routes';
import workoutsRoutes from './routes/workouts.routes';
import weightsRoutes from './routes/weights.routes';
import habitsRoutes from './routes/habits.routes';
import paymentsRoutes from './routes/payments.routes';
import mediaRoutes from './routes/media.routes';
import { ensureStorageBuckets } from './db/supabase';

const app = express();

// ----------------------------------------------------
// CORS Configuration (Section 37)
// ----------------------------------------------------
const allowedOrigins = [
  'https://pulse.avixstudio.in',
  'https://www.pulse.avixstudio.in',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];
if (ENV.FRONTEND_URL && !allowedOrigins.includes(ENV.FRONTEND_URL)) {
  allowedOrigins.push(ENV.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || !ENV.IS_PROD) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked: Origin not allowed'));
    }
  },
  credentials: true, // Allow cookies and auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'Pragma'],
}));

// Parsers & Security Middleware
app.use(cookieParser(ENV.SESSION_SECRET));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Anti-caching headers for API responses
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Rate limiting (Section 36)
app.use('/api', generalLimiter);

// ----------------------------------------------------
// Route Mounts
// ----------------------------------------------------
app.use(healthRoutes);
app.use(authRoutes);
app.use(groupsRoutes);
app.use(invitesRoutes);
app.use(syncRoutes);
app.use(usersRoutes);
app.use(logsRoutes);
app.use(workoutsRoutes);
app.use(weightsRoutes);
app.use(habitsRoutes);
app.use(paymentsRoutes);
app.use(mediaRoutes);

// Initialize Supabase storage buckets if configured
ensureStorageBuckets().catch(err => console.warn('[Supabase Init Warning]', err.message));

// Centralized error handler (Section 47)
app.use(errorHandler);

// HTTP & WebSocket Server Setup
const server = http.createServer(app);
initWebSocketServer(server);

// Start server if run directly
if (process.env.NODE_ENV !== 'test') {
  server.listen(ENV.PORT, () => {
    console.log(`[PULSE Production Server] Running on http://localhost:${ENV.PORT}`);
    console.log(`[PULSE Environment] NODE_ENV=${ENV.NODE_ENV}, PROD=${ENV.IS_PROD}`);
    console.log(`[PULSE WebSocket] ws://localhost:${ENV.PORT}/ws`);
  });
}

export { app, server };
export default app;
