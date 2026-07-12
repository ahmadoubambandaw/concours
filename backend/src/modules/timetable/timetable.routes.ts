// Emplois du temps : création de créneaux avec détection automatique
// des conflits (enseignant, salle, classe), vues par classe et par enseignant.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { findConflicts } from '../../utils/timetable';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';

const router = Router();

const slotSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherId: z.string().uuid(),
  classroomId: z.string().uuid().nullable().optional(),
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const checkConflicts = async (schoolId: string, candidate: any, excludeId?: string) => {
  const sameDay = await prisma.timetableSlot.findMany({
    where: {
      schoolId,
      dayOfWeek: candidate.dayOfWeek,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        { teacherId: candidate.teacherId },
        ...(candidate.classroomId ? [{ classroomId: candidate.classroomId }] : []),
        { classId: candidate.classId },
      ],
    },
  });
  return findConflicts({ ...candidate, id: excludeId }, sameDay);
};

router.get('/', requireTenant, requirePermission('timetable', 'read'), async (req, res, next) => {
  try {
    const where: any = { schoolId: req.schoolId };
    if (req.query.classId) where.classId = req.query.classId;
    if (req.query.teacherId) where.teacherId = req.query.teacherId;
    const slots = await prisma.timetableSlot.findMany({
      where,
      include: {
        subject: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classroom: true,
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    res.json(slots);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireTenant, requirePermission('timetable', 'create'), async (req, res, next) => {
  try {
    const data = slotSchema.parse(req.body);
    if (data.startTime >= data.endTime) {
      throw ApiError.badRequest("L'heure de fin doit être après l'heure de début");
    }
    const conflicts = await checkConflicts(req.schoolId!, data);
    if (conflicts.length > 0 && req.query.force !== 'true') {
      throw ApiError.conflict('Conflit d\'emploi du temps détecté');
    }
    const slot = await prisma.timetableSlot.create({
      data: { ...data, schoolId: req.schoolId! },
      include: { subject: true, teacher: true, classroom: true, class: true },
    });
    res.status(201).json({ slot, conflicts });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 409) {
      // Renvoie le détail des conflits pour affichage côté client.
      const data = slotSchema.safeParse(req.body);
      if (data.success) {
        const conflicts = await checkConflicts(req.schoolId!, data.data);
        return res.status(409).json({ error: err.message, conflicts });
      }
    }
    next(err);
  }
});

router.patch('/:id', requireTenant, requirePermission('timetable', 'update'), async (req, res, next) => {
  try {
    const existing = await prisma.timetableSlot.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
    });
    if (!existing) throw ApiError.notFound();
    const data = slotSchema.partial().parse(req.body);
    const candidate = { ...existing, ...data };
    const conflicts = await checkConflicts(req.schoolId!, candidate, existing.id);
    if (conflicts.length > 0 && req.query.force !== 'true') {
      return res.status(409).json({ error: 'Conflit d\'emploi du temps détecté', conflicts });
    }
    const slot = await prisma.timetableSlot.update({
      where: { id: existing.id },
      data,
      include: { subject: true, teacher: true, classroom: true, class: true },
    });
    res.json(slot);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireTenant, requirePermission('timetable', 'delete'), async (req, res, next) => {
  try {
    const existing = await prisma.timetableSlot.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
    });
    if (!existing) throw ApiError.notFound();
    await prisma.timetableSlot.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Vérification de conflit sans création (pré-validation côté client). */
router.post('/check', requireTenant, requirePermission('timetable', 'read'), async (req, res, next) => {
  try {
    const data = slotSchema.parse(req.body);
    const conflicts = await checkConflicts(req.schoolId!, data);
    res.json({ hasConflicts: conflicts.length > 0, conflicts });
  } catch (err) {
    next(err);
  }
});

export default router;
