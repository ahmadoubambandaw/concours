// Enseignants : dossier complet (contrat, salaire, diplômes),
// matières enseignées, création d'un compte de connexion.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { crudRouter } from '../../utils/crud';
import { hashPassword } from '../../utils/password';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';

const router = Router();

const teacherSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(['M', 'F']),
  birthDate: z.coerce.date().optional(),
  photoUrl: z.string().url().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  hireDate: z.coerce.date().optional(),
  contractType: z.enum(['CDI', 'CDD', 'VACATAIRE', 'FONCTIONNAIRE', 'STAGIAIRE']).default('CDI'),
  salary: z.number().int().min(0).nullable().optional(),
  diplomas: z.array(z.object({ title: z.string(), year: z.number().optional() })).optional(),
  specialty: z.string().optional(),
});

router.use(
  '/',
  crudRouter({
    model: 'teacher',
    resource: 'teachers',
    createSchema: teacherSchema,
    updateSchema: teacherSchema.partial(),
    searchFields: ['firstName', 'lastName', 'email', 'phone'],
    filterFields: ['contractType', 'status'],
    include: {
      subjects: { include: { subject: true } },
      user: { select: { id: true, email: true, status: true } },
      _count: { select: { mainOfClasses: true } },
    },
    orderBy: { lastName: 'asc' },
    softDelete: { field: 'status', value: 'INACTIVE' },
  }),
);

/** Crée un compte de connexion pour l'enseignant. */
router.post(
  '/:id/account',
  requireTenant,
  requirePermission('users', 'create'),
  async (req, res, next) => {
    try {
      const { email, password } = z
        .object({ email: z.string().email(), password: z.string().min(8) })
        .parse(req.body);
      const teacher = await prisma.teacher.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!teacher) throw ApiError.notFound();
      if (teacher.userId) throw ApiError.conflict('Cet enseignant a déjà un compte');

      const user = await prisma.user.create({
        data: {
          schoolId: req.schoolId,
          email: email.toLowerCase(),
          password: await hashPassword(password),
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          role: 'TEACHER',
        },
      });
      await prisma.teacher.update({ where: { id: teacher.id }, data: { userId: user.id } });
      res.status(201).json({ userId: user.id, email: user.email });
    } catch (err) {
      next(err);
    }
  },
);

/** Emploi du temps de l'enseignant. */
router.get(
  '/:id/timetable',
  requireTenant,
  requirePermission('timetable', 'read'),
  async (req, res, next) => {
    try {
      const slots = await prisma.timetableSlot.findMany({
        where: { teacherId: req.params.id, schoolId: req.schoolId },
        include: { subject: true, class: true, classroom: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
      res.json(slots);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
