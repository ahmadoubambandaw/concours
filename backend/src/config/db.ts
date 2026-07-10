import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Client Prisma partagé — un seul pool de connexions pour tout le process.
export const prisma = new PrismaClient({
  log: env.isProd ? ['error'] : ['warn', 'error'],
});
