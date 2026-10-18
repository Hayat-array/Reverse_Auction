import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: process.env.PRISMA_LOG === 'true' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  prisma = global.prisma;
}

export async function isDatabaseConnected() {
  try {
    if (!process.env.DATABASE_URL) return false;
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;
