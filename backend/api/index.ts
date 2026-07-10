// Point d'entrée serverless (Vercel) : expose l'application Express.
// En local / Docker, `src/main.ts` reste le point d'entrée serveur classique.

import { createApp } from '../src/app';

const app = createApp();

export default app;
