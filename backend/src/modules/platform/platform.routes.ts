// Administration de la plateforme (SUPER_ADMIN uniquement) :
// vue d'ensemble des établissements, activation/suspension, réseaux.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { requirePermission } from '../../middleware/auth.middleware';
import { getPagination, paginated } from '../../utils/pagination';

const router = Router();

// Défense en profondeur : seul le rôle SUPER_ADMIN passe, même si un rôle
// d'établissement possède un joker de permissions (*:*).
router.use((req, _res, next) => {
  if (req.user?.role !== 'SUPER_ADMIN') return next(ApiError.forbidden('Réservé à l\'opérateur de la plateforme'));
  next();
});
router.use(requirePermission('platform', 'read'));

router.get('/schools', async (req, res, next) => {
  try {
    const pagination = getPagination(req);
    const where: any = {};
    if (req.query.status) where.status = req.query.status;
    const search = String(req.query.search ?? '').trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        where,
        include: {
          _count: { select: { students: true, teachers: true, users: true } },
          network: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.school.count({ where }),
    ]);
    res.json(paginated(schools, total, pagination));
  } catch (err) {
    next(err);
  }
});

router.patch('/schools/:id', requirePermission('platform', 'update'), async (req, res, next) => {
  try {
    const data = z
      .object({
        status: z.enum(['ACTIVE', 'TRIAL', 'SUSPENDED', 'CLOSED']).optional(),
        trialEndsAt: z.coerce.date().optional(),
        networkId: z.string().uuid().nullable().optional(),
      })
      .parse(req.body);
    const school = await prisma.school.update({ where: { id: req.params.id }, data });
    res.json(school);
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const [schools, students, users, byStatus] = await Promise.all([
      prisma.school.count(),
      prisma.student.count(),
      prisma.user.count(),
      prisma.school.groupBy({ by: ['status'], _count: true }),
    ]);
    res.json({
      schools,
      students,
      users,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    });
  } catch (err) {
    next(err);
  }
});

// Réseaux d'établissements (groupes scolaires).
router.get('/networks', async (_req, res, next) => {
  try {
    const networks = await prisma.schoolNetwork.findMany({
      include: { schools: { select: { id: true, name: true, code: true } } },
    });
    res.json(networks);
  } catch (err) {
    next(err);
  }
});

router.post('/networks', requirePermission('platform', 'create'), async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(2) }).parse(req.body);
    const network = await prisma.schoolNetwork.create({ data: { name } });
    res.status(201).json(network);
  } catch (err) {
    next(err);
  }
});

export default router;
