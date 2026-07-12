// Gestion de l'établissement courant (paramètres, personnalisation)
// et des comptes utilisateurs de l'établissement.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { parseBody } from '../../utils/validate';
import { hashPassword } from '../../utils/password';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';
import { getPagination, paginated } from '../../utils/pagination';

const router = Router();

// --- Établissement courant ---

router.get('/current', requireTenant, async (req, res, next) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      include: { network: true },
    });
    if (!school) throw ApiError.notFound();
    res.json(school);
  } catch (err) {
    next(err);
  }
});

const schoolUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.enum(['MATERNELLE', 'PRIMAIRE', 'COLLEGE', 'LYCEE', 'COMPLEXE']).optional(),
  isPublic: z.boolean().optional(),
  logoUrl: z.string().url().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().length(2).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  currency: z.string().min(3).max(3).optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

router.patch(
  '/current',
  requireTenant,
  requirePermission('settings', 'update'),
  async (req, res, next) => {
    try {
      const data = parseBody(req, schoolUpdateSchema);
      const school = await prisma.school.update({
        where: { id: req.schoolId },
        data: data as any,
      });
      res.json(school);
    } catch (err) {
      next(err);
    }
  },
);

// --- Utilisateurs de l'établissement ---

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum([
    'SCHOOL_ADMIN', 'DIRECTOR', 'PRINCIPAL', 'ACCOUNTANT', 'SECRETARY',
    'TEACHER', 'PARENT', 'STUDENT', 'LIBRARIAN', 'SUPERVISOR', 'NURSE', 'DRIVER',
  ]),
  permissionOverrides: z.array(z.string()).optional(),
});

router.get(
  '/users',
  requireTenant,
  requirePermission('users', 'read'),
  async (req, res, next) => {
    try {
      const pagination = getPagination(req);
      const where: any = { schoolId: req.schoolId };
      if (req.query.role) where.role = req.query.role;
      const search = String(req.query.search ?? '').trim();
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true, email: true, phone: true, firstName: true, lastName: true,
            role: true, status: true, twoFactorEnabled: true, lastLoginAt: true,
            avatarUrl: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: pagination.skip,
          take: pagination.take,
        }),
        prisma.user.count({ where }),
      ]);
      res.json(paginated(users, total, pagination));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/users',
  requireTenant,
  requirePermission('users', 'create'),
  async (req, res, next) => {
    try {
      const data = parseBody(req, userCreateSchema);
      const user = await prisma.user.create({
        data: {
          schoolId: req.schoolId,
          email: data.email.toLowerCase(),
          password: await hashPassword(data.password),
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role,
          permissionOverrides: data.permissionOverrides ?? [],
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/users/:id',
  requireTenant,
  requirePermission('users', 'update'),
  async (req, res, next) => {
    try {
      const data = parseBody(
        req,
        userCreateSchema.partial().extend({
          status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']).optional(),
        }),
      );
      const existing = await prisma.user.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!existing) throw ApiError.notFound();
      const update: any = { ...data };
      if (data.password) update.password = await hashPassword(data.password);
      if (data.email) update.email = data.email.toLowerCase();
      // Déverrouillage manuel : remise à zéro du compteur d'échecs.
      if (data.status === 'ACTIVE') update.failedLogins = 0;
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: update,
        select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
      });
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
