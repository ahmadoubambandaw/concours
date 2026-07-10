// Ressources humaines : personnel administratif, demandes de congés
// (workflow d'approbation), paie mensuelle (génération en masse).

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { crudRouter } from '../../utils/crud';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';

const router = Router();

const staffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  hireDate: z.coerce.date().optional(),
  contractType: z.enum(['CDI', 'CDD', 'VACATAIRE', 'FONCTIONNAIRE', 'STAGIAIRE']).default('CDI'),
  salary: z.number().int().min(0).optional(),
});

router.use(
  '/staff',
  crudRouter({
    model: 'staff',
    resource: 'hr',
    createSchema: staffSchema,
    updateSchema: staffSchema.partial(),
    searchFields: ['firstName', 'lastName', 'position'],
    orderBy: { lastName: 'asc' },
    softDelete: { field: 'status', value: 'INACTIVE' },
  }),
);

const leaveSchema = z.object({
  teacherId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  type: z.string().default('CONGE'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
});

router.use(
  '/leaves',
  crudRouter({
    model: 'leaveRequest',
    resource: 'hr',
    createSchema: leaveSchema,
    updateSchema: leaveSchema.partial(),
    filterFields: ['status', 'teacherId', 'staffId'],
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
      staff: { select: { id: true, firstName: true, lastName: true, position: true } },
    },
    orderBy: { createdAt: 'desc' },
  }),
);

const leaveDecision = (status: 'APPROVED' | 'REJECTED') =>
  async (req: any, res: any, next: any) => {
    try {
      const leave = await prisma.leaveRequest.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!leave) throw ApiError.notFound();
      const updated = await prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status, decidedById: req.user!.id },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

router.post('/leaves/:id/approve', requireTenant, requirePermission('hr', 'validate'), leaveDecision('APPROVED'));
router.post('/leaves/:id/reject', requireTenant, requirePermission('hr', 'validate'), leaveDecision('REJECTED'));

/**
 * Génère la paie du mois pour tout le personnel (enseignants + administratifs)
 * à partir des salaires de base. Les entrées existantes du mois sont conservées.
 */
router.post(
  '/payroll/generate',
  requireTenant,
  requirePermission('payroll', 'create'),
  async (req, res, next) => {
    try {
      const { period } = z
        .object({ period: z.string().regex(/^\d{4}-\d{2}$/) })
        .parse(req.body);
      const [teachers, staff, existing] = await Promise.all([
        prisma.teacher.findMany({
          where: { schoolId: req.schoolId, status: 'ACTIVE', salary: { not: null } },
        }),
        prisma.staff.findMany({
          where: { schoolId: req.schoolId, status: 'ACTIVE', salary: { not: null } },
        }),
        prisma.payrollEntry.findMany({
          where: { schoolId: req.schoolId, period },
          select: { teacherId: true, staffId: true },
        }),
      ]);
      const doneTeachers = new Set(existing.map((e) => e.teacherId).filter(Boolean));
      const doneStaff = new Set(existing.map((e) => e.staffId).filter(Boolean));

      const entries = [
        ...teachers
          .filter((t) => !doneTeachers.has(t.id))
          .map((t) => ({
            schoolId: req.schoolId!,
            teacherId: t.id,
            period,
            gross: t.salary!,
            net: t.salary!,
          })),
        ...staff
          .filter((s) => !doneStaff.has(s.id))
          .map((s) => ({
            schoolId: req.schoolId!,
            staffId: s.id,
            period,
            gross: s.salary!,
            net: s.salary!,
          })),
      ];
      const created = await prisma.payrollEntry.createMany({ data: entries });
      res.status(201).json({ created: created.count, skipped: existing.length });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/payroll',
  requireTenant,
  requirePermission('payroll', 'read'),
  async (req, res, next) => {
    try {
      const where: any = { schoolId: req.schoolId };
      if (req.query.period) where.period = req.query.period;
      if (req.query.status) where.status = req.query.status;
      const entries = await prisma.payrollEntry.findMany({
        where,
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true } },
          staff: { select: { id: true, firstName: true, lastName: true, position: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      });
      const totals = await prisma.payrollEntry.aggregate({ where, _sum: { net: true } });
      res.json({ entries, totalNet: totals._sum.net ?? 0 });
    } catch (err) {
      next(err);
    }
  },
);

/** Mise à jour d'une entrée de paie (primes, retenues, validation, paiement). */
router.patch(
  '/payroll/:id',
  requireTenant,
  requirePermission('payroll', 'update'),
  async (req, res, next) => {
    try {
      const data = z
        .object({
          gross: z.number().int().min(0).optional(),
          deductions: z.number().int().min(0).optional(),
          bonuses: z.number().int().min(0).optional(),
          status: z.enum(['DRAFT', 'APPROVED', 'PAID']).optional(),
        })
        .parse(req.body);
      const entry = await prisma.payrollEntry.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!entry) throw ApiError.notFound();
      const gross = data.gross ?? entry.gross;
      const deductions = data.deductions ?? entry.deductions;
      const bonuses = data.bonuses ?? entry.bonuses;
      const updated = await prisma.payrollEntry.update({
        where: { id: entry.id },
        data: {
          ...data,
          net: gross + bonuses - deductions,
          ...(data.status === 'PAID' ? { paidAt: new Date() } : {}),
        },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
