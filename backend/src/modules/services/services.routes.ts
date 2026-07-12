// Vie scolaire — services : bibliothèque (emprunts/retours/amendes),
// cantine (menus/consommation), transport (bus/itinéraires/affectations).

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { crudRouter } from '../../utils/crud';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';

const router = Router();

// --- Bibliothèque ---

const bookSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  isbn: z.string().optional(),
  category: z.string().optional(),
  copies: z.number().int().min(1).default(1),
});

router.use(
  '/library/books',
  crudRouter({
    model: 'book',
    resource: 'library',
    createSchema: bookSchema,
    updateSchema: bookSchema.partial(),
    searchFields: ['title', 'author', 'isbn'],
    filterFields: ['category'],
    orderBy: { title: 'asc' },
    beforeCreate: (_req, data) => ({ ...data, available: data.copies }),
  }),
);

router.post(
  '/library/loans',
  requireTenant,
  requirePermission('library', 'create'),
  async (req, res, next) => {
    try {
      const data = z
        .object({
          bookId: z.string().uuid(),
          studentId: z.string().uuid(),
          dueAt: z.coerce.date(),
        })
        .parse(req.body);
      const book = await prisma.book.findFirst({
        where: { id: data.bookId, schoolId: req.schoolId },
      });
      if (!book) throw ApiError.notFound('Livre introuvable');
      if (book.available < 1) throw ApiError.conflict('Aucun exemplaire disponible');

      const loan = await prisma.$transaction(async (tx) => {
        await tx.book.update({
          where: { id: book.id },
          data: { available: { decrement: 1 } },
        });
        return tx.bookLoan.create({
          data: {
            schoolId: req.schoolId!,
            bookId: data.bookId,
            studentId: data.studentId,
            dueAt: data.dueAt,
          },
          include: { book: true, student: true },
        });
      });
      res.status(201).json(loan);
    } catch (err) {
      next(err);
    }
  },
);

/** Retour d'un livre — calcule l'amende si retard (par jour de retard). */
router.post(
  '/library/loans/:id/return',
  requireTenant,
  requirePermission('library', 'update'),
  async (req, res, next) => {
    try {
      const { finePerDay = 100 } = z
        .object({ finePerDay: z.number().int().min(0).optional() })
        .parse(req.body ?? {});
      const loan = await prisma.bookLoan.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!loan) throw ApiError.notFound();
      if (loan.returnedAt) throw ApiError.conflict('Livre déjà retourné');

      const now = new Date();
      const daysLate = Math.max(0, Math.floor((now.getTime() - loan.dueAt.getTime()) / 86400000));
      const updated = await prisma.$transaction(async (tx) => {
        await tx.book.update({
          where: { id: loan.bookId },
          data: { available: { increment: 1 } },
        });
        return tx.bookLoan.update({
          where: { id: loan.id },
          data: {
            returnedAt: now,
            status: daysLate > 0 ? 'LATE' : 'RETURNED',
            fine: daysLate * finePerDay,
          },
        });
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/library/loans',
  requireTenant,
  requirePermission('library', 'read'),
  async (req, res, next) => {
    try {
      const where: any = { schoolId: req.schoolId };
      if (req.query.status) where.status = req.query.status;
      if (req.query.studentId) where.studentId = req.query.studentId;
      const loans = await prisma.bookLoan.findMany({
        where,
        include: {
          book: true,
          student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
        },
        orderBy: { loanedAt: 'desc' },
        take: 200,
      });
      res.json(loans);
    } catch (err) {
      next(err);
    }
  },
);

// --- Cantine ---

const menuSchema = z.object({
  date: z.coerce.date(),
  meal: z.string().min(1),
  price: z.number().int().min(0).default(0),
});

router.use(
  '/canteen/menus',
  crudRouter({
    model: 'canteenMenu',
    resource: 'canteen',
    createSchema: menuSchema,
    updateSchema: menuSchema.partial(),
    orderBy: { date: 'desc' },
  }),
);

/** Enregistre la consommation du jour (pointage cantine). */
router.post(
  '/canteen/meals',
  requireTenant,
  requirePermission('canteen', 'create'),
  async (req, res, next) => {
    try {
      const data = z
        .object({
          studentId: z.string().uuid(),
          date: z.coerce.date().optional(),
          paid: z.boolean().default(false),
        })
        .parse(req.body);
      const date = new Date((data.date ?? new Date()).toISOString().slice(0, 10));
      const meal = await prisma.canteenMeal.upsert({
        where: { studentId_date: { studentId: data.studentId, date } },
        update: { paid: data.paid },
        create: { schoolId: req.schoolId!, studentId: data.studentId, date, paid: data.paid },
      });
      res.status(201).json(meal);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/canteen/meals',
  requireTenant,
  requirePermission('canteen', 'read'),
  async (req, res, next) => {
    try {
      const date = new Date(
        (req.query.date ? new Date(String(req.query.date)) : new Date()).toISOString().slice(0, 10),
      );
      const meals = await prisma.canteenMeal.findMany({
        where: { schoolId: req.schoolId, date },
        include: {
          student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
        },
      });
      res.json(meals);
    } catch (err) {
      next(err);
    }
  },
);

// --- Transport ---

const busSchema = z.object({
  name: z.string().min(1),
  plate: z.string().optional(),
  capacity: z.number().int().min(1).default(30),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
});

router.use(
  '/transport/buses',
  crudRouter({
    model: 'bus',
    resource: 'transport',
    createSchema: busSchema,
    updateSchema: busSchema.partial(),
    searchFields: ['name', 'plate', 'driverName'],
    include: { routes: true },
    orderBy: { name: 'asc' },
  }),
);

const routeSchema = z.object({
  name: z.string().min(1),
  busId: z.string().uuid().nullable().optional(),
  stops: z.array(z.object({ name: z.string(), time: z.string().optional() })).default([]),
  monthlyFee: z.number().int().min(0).default(0),
});

router.use(
  '/transport/routes',
  crudRouter({
    model: 'transportRoute',
    resource: 'transport',
    createSchema: routeSchema,
    updateSchema: routeSchema.partial(),
    searchFields: ['name'],
    include: {
      bus: true,
      students: {
        include: {
          student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  }),
);

router.post(
  '/transport/assignments',
  requireTenant,
  requirePermission('transport', 'create'),
  async (req, res, next) => {
    try {
      const data = z
        .object({
          studentId: z.string().uuid(),
          routeId: z.string().uuid(),
          stop: z.string().optional(),
        })
        .parse(req.body);
      const assignment = await prisma.studentTransport.upsert({
        where: { studentId_routeId: { studentId: data.studentId, routeId: data.routeId } },
        update: { stop: data.stop, active: true },
        create: { ...data, schoolId: req.schoolId! },
      });
      res.status(201).json(assignment);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
