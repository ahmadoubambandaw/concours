import type { Request } from 'express';
import type { ZodSchema } from 'zod';

/** Valide `req.body` avec un schéma Zod ; lève une ZodError sinon (gérée par l'error handler). */
export const parseBody = <T>(req: Request, schema: ZodSchema<T>): T => schema.parse(req.body);
