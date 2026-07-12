// Présences élèves et enseignants : appel par classe, pointage par QR code,
// statistiques par période.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';

const router = Router();

const day = (d: Date) => new Date(d.toISOString().slice(0, 10));

// --- Appel d'une classe (saisie en masse) ---

const bulkSchema = z.object({
  classId: z.string().uuid(),
  date: z.coerce.date(),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
        minutesLate: z.number().int().min(0).optional(),
        reason: z.string().optional(),
      }),
    )
    .min(1),
});

router.post(
  '/bulk',
  requireTenant,
  requirePermission('attendance', 'create'),
  async (req, res, next) => {
    try {
      const data = bulkSchema.parse(req.body);
      const date = day(data.date);
      const schoolClass = await prisma.schoolClass.findFirst({
        where: { id: data.classId, schoolId: req.schoolId },
      });
      if (!schoolClass) throw ApiError.notFound('Classe introuvable');

      const results = await prisma.$transaction(
        data.records.map((r) =>
          prisma.attendance.upsert({
            where: { studentId_date: { studentId: r.studentId, date } },
            update: {
              status: r.status,
              minutesLate: r.minutesLate,
              reason: r.reason,
              recordedById: req.user!.id,
            },
            create: {
              schoolId: req.schoolId!,
              classId: data.classId,
              studentId: r.studentId,
              date,
              status: r.status,
              minutesLate: r.minutesLate,
              reason: r.reason,
              recordedById: req.user!.id,
            },
          }),
        ),
      );
      res.status(201).json({ count: results.length });
    } catch (err) {
      next(err);
    }
  },
);

/** Pointage par scan du QR code du matricule (élève) — marque présent. */
router.post(
  '/scan',
  requireTenant,
  requirePermission('attendance', 'create'),
  async (req, res, next) => {
    try {
      const { matricule } = z.object({ matricule: z.string().min(3) }).parse(req.body);
      const student = await prisma.student.findFirst({
        where: { schoolId: req.schoolId, matricule },
        include: {
          enrollments: { where: { status: 'ACTIVE' }, take: 1, orderBy: { enrolledAt: 'desc' } },
        },
      });
      if (!student) throw ApiError.notFound('Matricule inconnu');
      const date = day(new Date());
      const record = await prisma.attendance.upsert({
        where: { studentId_date: { studentId: student.id, date } },
        update: { status: 'PRESENT', recordedById: req.user!.id },
        create: {
          schoolId: req.schoolId!,
          studentId: student.id,
          classId: student.enrollments[0]?.classId,
          date,
          status: 'PRESENT',
          recordedById: req.user!.id,
        },
      });
      res.json({
        student: { id: student.id, firstName: student.firstName, lastName: student.lastName, matricule },
        record,
      });
    } catch (err) {
      next(err);
    }
  },
);

/** Présence d'un enseignant. */
router.post(
  '/teacher',
  requireTenant,
  requirePermission('attendance', 'create'),
  async (req, res, next) => {
    try {
      const data = z
        .object({
          teacherId: z.string().uuid(),
          date: z.coerce.date(),
          status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
          minutesLate: z.number().int().optional(),
          reason: z.string().optional(),
        })
        .parse(req.body);
      const date = day(data.date);
      const record = await prisma.attendance.upsert({
        where: { teacherId_date: { teacherId: data.teacherId, date } },
        update: { status: data.status, minutesLate: data.minutesLate, reason: data.reason },
        create: {
          schoolId: req.schoolId!,
          teacherId: data.teacherId,
          date,
          status: data.status,
          minutesLate: data.minutesLate,
          reason: data.reason,
          recordedById: req.user!.id,
        },
      });
      res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  },
);

/** Feuille d'appel d'une classe pour une date. */
router.get(
  '/class/:classId',
  requireTenant,
  requirePermission('attendance', 'read'),
  async (req, res, next) => {
    try {
      const date = day(req.query.date ? new Date(String(req.query.date)) : new Date());
      const enrollments = await prisma.enrollment.findMany({
        where: { classId: req.params.classId, schoolId: req.schoolId, status: 'ACTIVE' },
        include: {
          student: { select: { id: true, matricule: true, firstName: true, lastName: true, photoUrl: true } },
        },
        orderBy: { student: { lastName: 'asc' } },
      });
      const records = await prisma.attendance.findMany({
        where: { classId: req.params.classId, schoolId: req.schoolId, date },
      });
      const byStudent = new Map(records.map((r) => [r.studentId, r]));
      res.json(
        enrollments.map((e) => ({
          student: e.student,
          record: byStudent.get(e.student.id) ?? null,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

/** Statistiques de présence (par élève, classe ou école). */
router.get(
  '/stats',
  requireTenant,
  requirePermission('attendance', 'read'),
  async (req, res, next) => {
    try {
      const where: any = { schoolId: req.schoolId, studentId: { not: null } };
      if (req.query.classId) where.classId = req.query.classId;
      if (req.query.studentId) where.studentId = req.query.studentId;
      if (req.query.from || req.query.to) {
        where.date = {
          ...(req.query.from ? { gte: day(new Date(String(req.query.from))) } : {}),
          ...(req.query.to ? { lte: day(new Date(String(req.query.to))) } : {}),
        };
      }
      const grouped = await prisma.attendance.groupBy({ by: ['status'], where, _count: true });
      const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count]));
      const total = grouped.reduce((sum, g) => sum + g._count, 0);
      res.json({
        total,
        present: counts.PRESENT ?? 0,
        absent: counts.ABSENT ?? 0,
        late: counts.LATE ?? 0,
        excused: counts.EXCUSED ?? 0,
        presenceRate: total ? Math.round((((counts.PRESENT ?? 0) + (counts.LATE ?? 0)) / total) * 1000) / 10 : null,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
