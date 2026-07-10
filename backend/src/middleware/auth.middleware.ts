import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/errors';
import { hasPermission, type Action } from '../auth/permissions';
import { prisma } from '../config/db';

export interface AuthUser {
  id: string;
  schoolId: string | null;
  role: Role;
  permissionOverrides: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Tenant courant : imposé par le token, jamais par le client. */
      schoolId?: string;
    }
  }
}

/** Authentifie la requête via le header `Authorization: Bearer <token>`. */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized();
    let payload;
    try {
      payload = verifyAccessToken(header.slice(7));
    } catch {
      throw ApiError.unauthorized('Session expirée, veuillez vous reconnecter');
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, schoolId: true, role: true, status: true, permissionOverrides: true },
    });
    if (!user || user.status !== 'ACTIVE') throw ApiError.unauthorized('Compte inactif');
    req.user = {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      permissionOverrides: (user.permissionOverrides as string[]) ?? [],
    };
    // Le SUPER_ADMIN peut agir sur une école donnée via l'en-tête X-School-Id.
    if (user.role === 'SUPER_ADMIN') {
      const headerSchool = req.headers['x-school-id'];
      req.schoolId = typeof headerSchool === 'string' ? headerSchool : undefined;
    } else {
      if (!user.schoolId) throw ApiError.forbidden('Utilisateur rattaché à aucun établissement');
      req.schoolId = user.schoolId;
    }
    next();
  } catch (err) {
    next(err);
  }
};

/** Garde RBAC : `requirePermission('students', 'create')`. */
export const requirePermission =
  (resource: string, action: Action) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!hasPermission(req.user.role, resource, action, req.user.permissionOverrides)) {
      return next(ApiError.forbidden(`Permission requise : ${resource}:${action}`));
    }
    next();
  };

/** Exige que la requête soit rattachée à un établissement (tenant). */
export const requireTenant = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.schoolId) {
    return next(
      ApiError.badRequest(
        "Établissement non précisé — le SUPER_ADMIN doit fournir l'en-tête X-School-Id",
      ),
    );
  }
  next();
};
