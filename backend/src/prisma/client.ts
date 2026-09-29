import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

let dbConnected: boolean | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL_MS = 15000; // Check every 15s

export async function checkDatabaseConnection(): Promise<boolean> {
  const now = Date.now();
  if (dbConnected !== null && now - lastCheckTime < CHECK_INTERVAL_MS) {
    return dbConnected;
  }

  lastCheckTime = now;
  try {
    // Quick query to test connection
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    return true;
  } catch (error: any) {
    console.error('[PostgreSQL] Connection check failed:', error?.message || error);
    dbConnected = false;
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return dbConnected === true;
}

// Background poller to auto-detect when PostgreSQL becomes available or reconnected
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (!dbConnected) {
      console.log('[PostgreSQL] Connection established. PostgreSQL is active and ready.');
    }
    dbConnected = true;
  } catch (error: any) {
    if (dbConnected) {
      console.warn('[PostgreSQL] Lost connection to database:', error?.message || error);
    }
    dbConnected = false;
  }
  lastCheckTime = Date.now();
}, CHECK_INTERVAL_MS);
