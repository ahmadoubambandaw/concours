// Pré-inscriptions (formulaire public) et inscriptions avec options
// (cantine, transport, uniforme…) et génération automatique de la facture.

import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { crudRouter } from '../../utils/crud';
import { nextInvoiceNumber, nextMatricule } from '../../utils/numbering';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';
import { assertStudentQuota } from '../../middleware/plan.middleware';

const router = Router();

// --- Pré-inscriptions ---

const preRegSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(['M', 'F']),
  birthDate: z.coerce.date(),
  desiredLevel: z.string().min(1),
  previousSchool: z.string().optional(),
  guardianName: z.string().min(2),
  guardianPhone: z.string().min(5),
  guardianEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

router.use(
  '/preregistrations',
  crudRouter({
    model: 'preRegistration',
    resource: 'preregistrations',
    createSchema: preRegSchema,
    updateSchema: preRegSchema.partial().extend({
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    }),
    searchFields: ['firstName', 'lastName', 'guardianName', 'guardianPhone'],
    filterFields: ['status'],
    orderBy: { createdAt: 'desc' },
  }),
);

/**
 * Convertit une pré-inscription approuvée en élève inscrit :
 * crée l'élève (matricule + QR), le tuteur, l'inscription dans la classe.
 */
router.post(
  '/preregistrations/:id/convert',
  requireTenant,
  requirePermission('enrollments', 'create'),
  async (req, res, next) => {
    try {
      const { classId } = z.object({ classId: z.string().uuid() }).parse(req.body);
      const preReg = await prisma.preRegistration.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!preReg) throw ApiError.notFound();
      if (preReg.status === 'CONVERTED') throw ApiError.conflict('Déjà convertie en inscription');

      const schoolClass = await prisma.schoolClass.findFirst({
        where: { id: classId, schoolId: req.schoolId },
      });
      if (!schoolClass) throw ApiError.notFound('Classe introuvable');
      const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
      // La conversion crée un élève : soumise à la limite de la formule.
      await assertStudentQuota(req.schoolId!);

      const result = await prisma.$transaction(async (tx) => {
        const matricule = await nextMatricule(tx, school!.id, school!.code);
        const qrCode = await QRCode.toDataURL(matricule, { margin: 1, width: 240 });
        const student = await tx.student.create({
          data: {
            schoolId: school!.id,
            matricule,
            qrCode,
            firstName: preReg.firstName,
            lastName: preReg.lastName,
            gender: preReg.gender,
            birthDate: preReg.birthDate,
          },
        });
        const [guardianFirst, ...rest] = preReg.guardianName.split(' ');
        const guardian = await tx.guardian.create({
          data: {
            schoolId: school!.id,
            firstName: guardianFirst,
            lastName: rest.join(' ') || guardianFirst,
            phone: preReg.guardianPhone,
            email: preReg.guardianEmail,
          },
        });
        await tx.studentGuardian.create({
          data: { studentId: student.id, guardianId: guardian.id, isPrimary: true },
        });
        const enrollment = await tx.enrollment.create({
          data: {
            schoolId: school!.id,
            studentId: student.id,
            classId,
            academicYearId: schoolClass.academicYearId,
          },
        });
        await tx.preRegistration.update({
          where: { id: preReg.id },
          data: { status: 'CONVERTED', studentId: student.id },
        });
        return { student, enrollment };
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// --- Inscriptions ---

const enrollmentSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  options: z
    .object({
      canteen: z.boolean().optional(),
      transport: z.boolean().optional(),
      uniform: z.boolean().optional(),
      insurance: z.boolean().optional(),
      library: z.boolean().optional(),
    })
    .default({}),
  /** Génère immédiatement la facture des frais applicables. */
  generateInvoice: z.boolean().default(true),
});

router.get(
  '/enrollments',
  requireTenant,
  requirePermission('enrollments', 'read'),
  async (req, res, next) => {
    try {
      const where: any = { schoolId: req.schoolId };
      if (req.query.classId) where.classId = req.query.classId;
      if (req.query.academicYearId) where.academicYearId = req.query.academicYearId;
      if (req.query.status) where.status = req.query.status;
      const enrollments = await prisma.enrollment.findMany({
        where,
        include: {
          student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
          class: { include: { level: true } },
          academicYear: true,
        },
        orderBy: { enrolledAt: 'desc' },
        take: 200,
      });
      res.json(enrollments);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/enrollments',
  requireTenant,
  requirePermission('enrollments', 'create'),
  async (req, res, next) => {
    try {
      const data = enrollmentSchema.parse(req.body);
      const [student, schoolClass] = await Promise.all([
        prisma.student.findFirst({ where: { id: data.studentId, schoolId: req.schoolId } }),
        prisma.schoolClass.findFirst({
          where: { id: data.classId, schoolId: req.schoolId },
          include: { _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } } },
        }),
      ]);
      if (!student || !schoolClass) throw ApiError.notFound('Élève ou classe introuvable');
      if (schoolClass._count.enrollments >= schoolClass.capacity) {
        throw ApiError.conflict(
          `La classe ${schoolClass.name} est pleine (${schoolClass.capacity} places)`,
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const enrollment = await tx.enrollment.create({
          data: {
            schoolId: req.schoolId!,
            studentId: data.studentId,
            classId: data.classId,
            academicYearId: schoolClass.academicYearId,
            options: data.options,
          },
        });

        let invoice = null;
        if (data.generateInvoice) {
          // Frais applicables : inscription + scolarité du niveau
          // + options souscrites (cantine, transport…).
          const selectedCategories = ['INSCRIPTION', 'SCOLARITE'];
          if (data.options.canteen) selectedCategories.push('CANTINE');
          if (data.options.transport) selectedCategories.push('TRANSPORT');
          if (data.options.uniform) selectedCategories.push('UNIFORME');
          if (data.options.insurance) selectedCategories.push('ASSURANCE');
          if (data.options.library) selectedCategories.push('BIBLIOTHEQUE');

          const fees = await tx.feeStructure.findMany({
            where: {
              schoolId: req.schoolId,
              category: { in: selectedCategories as any },
              OR: [{ levelId: null }, { levelId: schoolClass.levelId }],
            },
          });
          if (fees.length > 0) {
            const number = await nextInvoiceNumber(tx, req.schoolId!);
            const total = fees.reduce((sum, f) => sum + f.amount, 0);
            invoice = await tx.invoice.create({
              data: {
                schoolId: req.schoolId!,
                studentId: data.studentId,
                number,
                total,
                dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                items: {
                  create: fees.map((f) => ({
                    feeStructureId: f.id,
                    label: f.name,
                    unitAmount: f.amount,
                    amount: f.amount,
                  })),
                },
              },
              include: { items: true },
            });
          }
        }
        return { enrollment, invoice };
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/enrollments/:id',
  requireTenant,
  requirePermission('enrollments', 'update'),
  async (req, res, next) => {
    try {
      const data = z
        .object({
          classId: z.string().uuid().optional(),
          status: z.enum(['ACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'COMPLETED']).optional(),
          options: z.record(z.boolean()).optional(),
        })
        .parse(req.body);
      const existing = await prisma.enrollment.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!existing) throw ApiError.notFound();
      const enrollment = await prisma.enrollment.update({
        where: { id: existing.id },
        data: data as any,
      });
      res.json(enrollment);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
