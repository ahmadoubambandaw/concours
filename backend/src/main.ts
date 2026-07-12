import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/db';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`🎓 Scolaris API démarrée sur http://localhost:${env.port} (${env.nodeEnv})`);
});

const shutdown = async (signal: string) => {
  console.log(`\n${signal} reçu, arrêt en cours…`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
