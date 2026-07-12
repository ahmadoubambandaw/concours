// Discipline (sanctions, convocations) et infirmerie (consultations,
// vaccinations, traitements).

import { Router } from 'express';
import { z } from 'zod';
import { crudRouter } from '../../utils/crud';

const router = Router();

const disciplineSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum([
    'AVERTISSEMENT', 'BLAME', 'RETENUE',
    'EXCLUSION_TEMPORAIRE', 'EXCLUSION_DEFINITIVE', 'CONVOCATION_PARENTS',
  ]),
  date: z.coerce.date().optional(),
  description: z.string().min(1),
  sanction: z.string().optional(),
  resolvedAt: z.coerce.date().nullable().optional(),
});

router.use(
  '/discipline',
  crudRouter({
    model: 'disciplineCase',
    resource: 'discipline',
    createSchema: disciplineSchema,
    updateSchema: disciplineSchema.partial(),
    filterFields: ['studentId', 'type'],
    include: {
      student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
    },
    orderBy: { date: 'desc' },
  }),
);

const medicalSchema = z.object({
  studentId: z.string().uuid(),
  date: z.coerce.date().optional(),
  type: z.string().default('CONSULTATION'),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
});

router.use(
  '/infirmary/visits',
  crudRouter({
    model: 'medicalVisit',
    resource: 'infirmary',
    createSchema: medicalSchema,
    updateSchema: medicalSchema.partial(),
    filterFields: ['studentId', 'type'],
    include: {
      student: {
        select: {
          id: true, matricule: true, firstName: true, lastName: true,
          bloodType: true, allergies: true, medicalNotes: true,
        },
      },
    },
    orderBy: { date: 'desc' },
  }),
);

export default router;
