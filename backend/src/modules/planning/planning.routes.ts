// Examens, cahier de texte / devoirs, calendrier scolaire.

import { Router } from 'express';
import { z } from 'zod';
import { crudRouter } from '../../utils/crud';

const router = Router();

const examSchema = z.object({
  name: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']).default('PLANNED'),
  notes: z.string().optional(),
});

router.use(
  '/exams',
  crudRouter({
    model: 'exam',
    resource: 'exams',
    createSchema: examSchema,
    updateSchema: examSchema.partial(),
    searchFields: ['name'],
    filterFields: ['status'],
    include: { assessments: { include: { subject: true, class: true } } },
    orderBy: { startDate: 'desc' },
  }),
);

const homeworkSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.coerce.date(),
});

router.use(
  '/homework',
  crudRouter({
    model: 'homework',
    resource: 'homework',
    createSchema: homeworkSchema,
    updateSchema: homeworkSchema.partial(),
    searchFields: ['title'],
    filterFields: ['classId', 'subjectId'],
    include: {
      subject: true,
      class: { select: { id: true, name: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { dueDate: 'desc' },
  }),
);

const eventSchema = z.object({
  title: z.string().min(1),
  type: z.string().default('GENERAL'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  allDay: z.boolean().default(true),
  notes: z.string().optional(),
});

router.use(
  '/events',
  crudRouter({
    model: 'schoolEvent',
    resource: 'events',
    createSchema: eventSchema,
    updateSchema: eventSchema.partial(),
    searchFields: ['title'],
    filterFields: ['type'],
    orderBy: { startDate: 'asc' },
  }),
);

export default router;
