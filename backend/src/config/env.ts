import dotenv from 'dotenv';

dotenv.config();

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: required('DATABASE_URL', 'postgresql://scolaris:scolaris@localhost:5432/scolaris'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS ?? '30', 10),
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  },
  storage: {
    dir: process.env.STORAGE_DIR ?? 'storage',
  },
  // URL publique du frontend (redirections de retour PayDunya).
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000',
  // URL publique de l'API (callback IPN PayDunya). Sur le déploiement
  // mono-domaine Vercel, l'API est servie sous /api/backend.
  publicApiUrl: process.env.PUBLIC_API_URL ?? 'http://localhost:4000',
  paydunya: {
    // Clés du compte PayDunya (https://app.paydunya.com → Intégrations → API).
    masterKey: process.env.PAYDUNYA_MASTER_KEY ?? '',
    privateKey: process.env.PAYDUNYA_PRIVATE_KEY ?? '',
    publicKey: process.env.PAYDUNYA_PUBLIC_KEY ?? '',
    token: process.env.PAYDUNYA_TOKEN ?? '',
    // 'test' (sandbox) ou 'live' (production).
    mode: process.env.PAYDUNYA_MODE ?? 'test',
    get configured() {
      return Boolean(this.masterKey && this.privateKey && this.token);
    },
  },
  isProd: (process.env.NODE_ENV ?? 'development') === 'production',
};
