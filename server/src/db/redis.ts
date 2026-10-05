import { Redis } from '@upstash/redis';
import { ENV } from '../config/env';

let redisClient: Redis | null = null;

if (ENV.REDIS_URL && ENV.REDIS_TOKEN) {
  try {
    redisClient = new Redis({
      url: ENV.REDIS_URL,
      token: ENV.REDIS_TOKEN,
    });
    console.log('[Redis] Upstash Redis cache client initialized');
  } catch (err) {
    console.warn('[Redis] Failed to initialize Upstash Redis:', err);
    redisClient = null;
  }
} else {
  console.log('[Redis] Running without Redis cache (all queries direct to primary database)');
}

export const redis = redisClient;

/**
 * Cache group-sync payload for ephemeral acceleration.
 * TTL: 30 seconds (stale cache won't persist; PostgreSQL is source of truth).
 */
export async function cacheGroupSync(groupId: string, data: any, ttlSeconds = 30): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(`cache:group_sync:${groupId}`, JSON.stringify(data), { ex: ttlSeconds });
  } catch (err) {
    console.warn('[Redis Cache Set Error]', (err as Error).message);
  }
}

export async function getCachedGroupSync(groupId: string): Promise<any | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(`cache:group_sync:${groupId}`);
    if (typeof raw === 'string') {
      return JSON.parse(raw);
    }
    return raw || null;
  } catch (err) {
    console.warn('[Redis Cache Get Error]', (err as Error).message);
    return null;
  }
}

export async function invalidateGroupSync(groupId: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(`cache:group_sync:${groupId}`);
  } catch (err) {
    console.warn('[Redis Cache Invalidation Error]', (err as Error).message);
  }
}
