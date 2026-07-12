// Structure académique : années scolaires (avec cycle de vie), trimestres,
// niveaux, salles, classes et matières.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { crudRouter } from '../../utils/crud';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';

const router = Router();

// --- Années scolaires ---

const yearSchema = z.object({
  name: z.string().min(4),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

router.use(
  '/academic-years',
  crudRouter({
    model: 'academicYear',
    resource: 'academicYears',
    createSchema: yearSchema,
    updateSchema: yearSchema.partial(),
    searchFields: ['name'],
    filterFields: ['status'],
    include: { terms: { orderBy: { order: 'asc' } } },
    orderBy: { startDate: 'desc' },
  }),
);

// Cycle de vie : clôture, archivage, réouverture.
const yearTransition = (status: 'CLOSED' | 'ARCHIVED' | 'ACTIVE') =>
  async (req: any, res: any, next: any) => {
    try {
      const year = await prisma.academicYear.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!year) throw ApiError.notFound();
      const updated = await prisma.academicYear.update({
        where: { id: year.id },
        data: { status },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

router.post('/academic-years/:id/close', requireTenant, requirePermission('academicYears', 'validate'), yearTransition('CLOSED'));
router.post('/academic-years/:id/archive', requireTenant, requirePermission('academicYears', 'validate'), yearTransition('ARCHIVED'));
router.post('/academic-years/:id/reopen', requireTenant, requirePermission('academicYears', 'validate'), yearTransition('ACTIVE'));

// --- Trimestres / semestres ---

const termSchema = z.object({
  academicYearId: z.string().uuid(),
  name: z.string().min(2),
  order: z.number().int().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

router.use(
  '/terms',
  crudRouter({
    model: 'term',
    resource: 'academicYears',
    createSchema: termSchema,
    updateSchema: termSchema.partial(),
    filterFields: ['academicYearId'],
    orderBy: { order: 'asc' },
  }),
);

// --- Niveaux ---

const levelSchema = z.object({
  name: z.string().min(1),
  cycle: z.enum(['MATERNELLE', 'PRIMAIRE', 'COLLEGE', 'LYCEE']),
  order: z.number().int().default(0),
});

router.use(
  '/levels',
  crudRouter({
    model: 'level',
    resource: 'levels',
    createSchema: levelSchema,
    updateSchema: levelSchema.partial(),
    searchFields: ['name'],
    filterFields: ['cycle'],
    orderBy: [{ cycle: 'asc' }, { order: 'asc' }],
  }),
);

// --- Salles ---

const classroomSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().min(1).default(40),
  building: z.string().optional(),
});

router.use(
  '/classrooms',
  crudRouter({
    model: 'classroom',
    resource: 'classes',
    createSchema: classroomSchema,
    updateSchema: classroomSchema.partial(),
    searchFields: ['name'],
    orderBy: { name: 'asc' },
  }),
);

// --- Classes ---

const classSchema = z.object({
  name: z.string().min(1),
  academicYearId: z.string().uuid(),
  levelId: z.string().uuid(),
  classroomId: z.string().uuid().nullable().optional(),
  mainTeacherId: z.string().uuid().nullable().optional(),
  capacity: z.number().int().min(1).default(50),
});

router.use(
  '/classes',
  crudRouter({
    model: 'schoolClass',
    resource: 'classes',
    createSchema: classSchema,
    updateSchema: classSchema.partial(),
    searchFields: ['name'],
    filterFields: ['academicYearId', 'levelId'],
    include: {
      level: true,
      classroom: true,
      mainTeacher: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
    },
    orderBy: { name: 'asc' },
  }),
);

// Liste des élèves d'une classe (via inscriptions actives).
router.get(
  '/classes/:id/students',
  requireTenant,
  requirePermission('students', 'read'),
  async (req, res, next) => {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { classId: req.params.id, schoolId: req.schoolId, status: 'ACTIVE' },
        include: {
          student: {
            select: {
              id: true, matricule: true, firstName: true, lastName: true,
              gender: true, birthDate: true, photoUrl: true, status: true,
            },
          },
        },
        orderBy: { student: { lastName: 'asc' } },
      });
      res.json(enrollments.map((e) => ({ ...e.student, enrollmentId: e.id, options: e.options })));
    } catch (err) {
      next(err);
    }
  },
);

// --- Matières ---

const subjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  coefficient: z.number().min(0.5).max(20).default(1),
  levelId: z.string().uuid().nullable().optional(),
  teacherIds: z.array(z.string().uuid()).optional(),
});

router.use(
  '/subjects',
  crudRouter({
    model: 'subject',
    resource: 'subjects',
    createSchema: subjectSchema.omit({ teacherIds: true }),
    updateSchema: subjectSchema.omit({ teacherIds: true }).partial(),
    searchFields: ['name', 'code'],
    filterFields: ['levelId'],
    include: {
      level: true,
      teachers: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } },
    },
    orderBy: { name: 'asc' },
  }),
);

// Affectation des enseignants à une matière.
router.put(
  '/subjects/:id/teachers',
  requireTenant,
  requirePermission('subjects', 'update'),
  async (req, res, next) => {
    try {
      const { teacherIds } = z.object({ teacherIds: z.array(z.string().uuid()) }).parse(req.body);
      const subject = await prisma.subject.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!subject) throw ApiError.notFound();
      await prisma.$transaction([
        prisma.teacherSubject.deleteMany({ where: { subjectId: subject.id } }),
        prisma.teacherSubject.createMany({
          data: teacherIds.map((teacherId) => ({ teacherId, subjectId: subject.id })),
          skipDuplicates: true,
        }),
      ]);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
