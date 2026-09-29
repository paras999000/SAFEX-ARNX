import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error'],
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
  } catch (error) {
    dbConnected = false;
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return dbConnected === true;
}

// Background poller to auto-detect when PostgreSQL becomes available
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (!dbConnected) {
      console.log('[PostgreSQL] Connection established. PostgreSQL is now active.');
    }
    dbConnected = true;
  } catch {
    dbConnected = false;
  }
  lastCheckTime = Date.now();
}, CHECK_INTERVAL_MS);
