// Élèves : dossier complet avec matricule automatique, QR code,
// dossier médical, historique scolaire, parents/tuteurs liés.

import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { crudRouter } from '../../utils/crud';
import { nextMatricule } from '../../utils/numbering';
import { hashPassword } from '../../utils/password';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';
import { assertStudentQuota } from '../../middleware/plan.middleware';

const router = Router();

const studentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(['M', 'F']),
  birthDate: z.coerce.date(),
  birthPlace: z.string().optional(),
  nationality: z.string().default('SN'),
  photoUrl: z.string().url().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  bloodType: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  medicalNotes: z.string().nullable().optional(),
});

const baseCrud = crudRouter({
  model: 'student',
  resource: 'students',
  createSchema: studentSchema,
  updateSchema: studentSchema.partial(),
  searchFields: ['firstName', 'lastName', 'matricule'],
  filterFields: ['status', 'gender'],
  include: {
    guardians: { include: { guardian: true } },
    enrollments: {
      where: { status: 'ACTIVE' },
      include: { class: { include: { level: true } }, academicYear: true },
      take: 1,
      orderBy: { enrolledAt: 'desc' },
    },
  },
  orderBy: { lastName: 'asc' },
  softDelete: { field: 'status', value: 'INACTIVE' },
});

// La création passe par une route dédiée (matricule + QR code générés),
// on intercepte donc le POST avant le CRUD générique.
router.post(
  '/',
  requireTenant,
  requirePermission('students', 'create'),
  async (req, res, next) => {
    try {
      const data = studentSchema.parse(req.body);
      const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
      if (!school) throw ApiError.notFound('Établissement introuvable');
      // Limite d'élèves selon la formule d'abonnement.
      await assertStudentQuota(req.schoolId!);

      const student = await prisma.$transaction(async (tx) => {
        const matricule = await nextMatricule(tx, school.id, school.code);
        const qrCode = await QRCode.toDataURL(matricule, { margin: 1, width: 240 });
        return tx.student.create({
          data: { ...data, schoolId: school.id, matricule, qrCode },
        });
      });
      res.status(201).json(student);
    } catch (err) {
      next(err);
    }
  },
);

router.use('/', baseCrud);

/** Dossier complet : historique scolaire, finances, présences, discipline. */
router.get(
  '/:id/full',
  requireTenant,
  requirePermission('students', 'read'),
  async (req, res, next) => {
    try {
      const student = await prisma.student.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
        include: {
          guardians: { include: { guardian: true } },
          enrollments: {
            include: { class: { include: { level: true } }, academicYear: true },
            orderBy: { enrolledAt: 'desc' },
          },
          invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
          payments: { orderBy: { paidAt: 'desc' }, take: 10 },
          reportCards: { include: { term: true }, orderBy: { createdAt: 'desc' } },
          disciplineCases: { orderBy: { date: 'desc' }, take: 10 },
          medicalVisits: { orderBy: { date: 'desc' }, take: 10 },
          documents: { orderBy: { createdAt: 'desc' } },
          transports: { include: { route: true } },
        },
      });
      if (!student) throw ApiError.notFound();

      const [attendanceStats, balance] = await Promise.all([
        prisma.attendance.groupBy({
          by: ['status'],
          where: { studentId: student.id },
          _count: true,
        }),
        prisma.invoice.aggregate({
          where: { studentId: student.id, status: { notIn: ['CANCELLED', 'DRAFT'] } },
          _sum: { total: true, paid: true },
        }),
      ]);

      res.json({
        ...student,
        attendanceStats: Object.fromEntries(attendanceStats.map((s) => [s.status, s._count])),
        finance: {
          invoiced: balance._sum.total ?? 0,
          paid: balance._sum.paid ?? 0,
          due: (balance._sum.total ?? 0) - (balance._sum.paid ?? 0),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/** Lie un parent/tuteur à l'élève (création ou rattachement). */
const guardianLinkSchema = z.object({
  relation: z.enum(['FATHER', 'MOTHER', 'TUTOR', 'OTHER']).default('TUTOR'),
  isPrimary: z.boolean().default(false),
  guardianId: z.string().uuid().optional(),
  guardian: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().min(5),
      email: z.string().email().optional(),
      occupation: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
});

router.post(
  '/:id/guardians',
  requireTenant,
  requirePermission('guardians', 'create'),
  async (req, res, next) => {
    try {
      const data = guardianLinkSchema.parse(req.body);
      const student = await prisma.student.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!student) throw ApiError.notFound();

      let guardianId = data.guardianId;
      if (!guardianId) {
        if (!data.guardian) throw ApiError.badRequest('guardianId ou guardian requis');
        // Réutilise un tuteur existant avec le même téléphone (fratries).
        const existing = await prisma.guardian.findFirst({
          where: { schoolId: req.schoolId, phone: data.guardian.phone },
        });
        const guardian =
          existing ??
          (await prisma.guardian.create({
            data: { ...data.guardian, schoolId: req.schoolId! },
          }));
        guardianId = guardian.id;
      }

      const link = await prisma.studentGuardian.upsert({
        where: { studentId_guardianId: { studentId: student.id, guardianId } },
        update: { relation: data.relation, isPrimary: data.isPrimary },
        create: {
          studentId: student.id,
          guardianId,
          relation: data.relation,
          isPrimary: data.isPrimary,
        },
        include: { guardian: true },
      });
      res.status(201).json(link);
    } catch (err) {
      next(err);
    }
  },
);

/** Crée un compte portail élève. */
router.post(
  '/:id/account',
  requireTenant,
  requirePermission('users', 'create'),
  async (req, res, next) => {
    try {
      const { email, password } = z
        .object({ email: z.string().email(), password: z.string().min(8) })
        .parse(req.body);
      const student = await prisma.student.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!student) throw ApiError.notFound();
      if (student.userId) throw ApiError.conflict('Cet élève a déjà un compte');
      const user = await prisma.user.create({
        data: {
          schoolId: req.schoolId,
          email: email.toLowerCase(),
          password: await hashPassword(password),
          firstName: student.firstName,
          lastName: student.lastName,
          role: 'STUDENT',
        },
      });
      await prisma.student.update({ where: { id: student.id }, data: { userId: user.id } });
      res.status(201).json({ userId: user.id, email: user.email });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
