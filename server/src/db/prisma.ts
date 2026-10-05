import { PrismaClient } from '@prisma/client';
import { ENV } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma || new PrismaClient({
  log: ENV.IS_PROD ? ['error', 'warn'] : ['warn', 'error'],
});

if (!ENV.IS_PROD) {
  global.__prisma = prisma;
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    console.warn('[Prisma] Database connection test failed:', (err as Error).message);
    return false;
  }
}
