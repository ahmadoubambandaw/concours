import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/errors';
import { env } from '../config/env';

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route introuvable' });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Données invalides',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Un enregistrement identique existe déjà' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Ressource introuvable' });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({ error: 'Opération impossible : des données liées existent' });
    }
  }
  console.error('[erreur non gérée]', err);
  return res.status(500).json({
    error: env.isProd ? 'Erreur interne du serveur' : String((err as Error)?.message ?? err),
  });
};
