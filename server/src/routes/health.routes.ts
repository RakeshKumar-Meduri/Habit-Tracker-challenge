import { Router } from 'express';
import { prisma, testDatabaseConnection } from '../db/prisma';
import { redis } from '../db/redis';

const router = Router();

router.get('/api/health', async (req, res) => {
  const dbConnected = await testDatabaseConnection();
  
  let redisStatus = 'disabled';
  if (redis) {
    try {
      await redis.ping();
      redisStatus = 'connected';
    } catch {
      redisStatus = 'disconnected';
    }
  }

  const isHealthy = dbConnected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    redis: redisStatus,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
