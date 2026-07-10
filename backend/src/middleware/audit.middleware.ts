import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/db';

// Journal d'audit : trace toutes les écritures (POST/PUT/PATCH/DELETE)
// avec l'utilisateur, la ressource et l'IP. L'écriture du log est
// asynchrone et ne bloque jamais la réponse.
export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.user) return;
    const segments = req.path.split('/').filter(Boolean); // api/v1/students/:id
    const resource = segments[2] ?? 'unknown';
    const resourceId = segments[3];
    const actionVerb =
      req.method === 'POST' ? 'create' : req.method === 'DELETE' ? 'delete' : 'update';
    prisma.auditLog
      .create({
        data: {
          schoolId: req.schoolId ?? null,
          userId: req.user.id,
          action: `${resource}.${actionVerb}`,
          resource,
          resourceId: resourceId ?? null,
          ip: req.ip,
          metadata: { method: req.method, path: req.path },
        },
      })
      .catch(() => undefined);
  });
  next();
};
