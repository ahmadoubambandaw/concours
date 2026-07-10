// Portails Parent / Élève / Enseignant : données strictement limitées
// au périmètre de l'utilisateur connecté (ses enfants, son dossier,
// ses classes) — indépendamment des permissions génériques.

import { Router } from 'express';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { requireTenant } from '../../middleware/auth.middleware';

const router = Router();

const studentSnapshot = async (studentId: string) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      enrollments: {
        where: { status: 'ACTIVE' },
        include: { class: { include: { level: true } }, academicYear: true },
        take: 1,
        orderBy: { enrolledAt: 'desc' },
      },
    },
  });
  if (!student) return null;
  const classId = student.enrollments[0]?.classId;
  const [reportCards, attendance, invoices, homework, timetable] = await Promise.all([
    prisma.reportCard.findMany({
      where: { studentId, status: 'PUBLISHED' },
      include: { term: { include: { academicYear: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    prisma.invoice.findMany({
      where: { studentId, status: { notIn: ['DRAFT', 'CANCELLED'] } },
      include: { payments: true },
      orderBy: { createdAt: 'desc' },
    }),
    classId
      ? prisma.homework.findMany({
          where: { classId, dueDate: { gte: new Date(Date.now() - 7 * 86400000) } },
          include: { subject: true },
          orderBy: { dueDate: 'asc' },
          take: 20,
        })
      : [],
    classId
      ? prisma.timetableSlot.findMany({
          where: { classId },
          include: { subject: true, teacher: { select: { firstName: true, lastName: true } }, classroom: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        })
      : [],
  ]);
  return {
    student: {
      id: student.id,
      matricule: student.matricule,
      firstName: student.firstName,
      lastName: student.lastName,
      photoUrl: student.photoUrl,
      class: student.enrollments[0]?.class ?? null,
    },
    reportCards,
    attendance,
    invoices: invoices.map((i) => ({
      id: i.id,
      number: i.number,
      total: i.total,
      paid: i.paid,
      due: i.total - i.paid,
      status: i.status,
      dueDate: i.dueDate,
    })),
    homework,
    timetable,
  };
};

/** Portail parent : tableau de bord de tous ses enfants. */
router.get('/parent', requireTenant, async (req, res, next) => {
  try {
    if (req.user!.role !== 'PARENT') throw ApiError.forbidden('Réservé aux parents');
    const guardian = await prisma.guardian.findFirst({
      where: { userId: req.user!.id, schoolId: req.schoolId },
      include: { students: true },
    });
    if (!guardian) throw ApiError.notFound('Profil parent introuvable');
    const children = await Promise.all(
      guardian.students.map((link) => studentSnapshot(link.studentId)),
    );
    res.json({ children: children.filter(Boolean) });
  } catch (err) {
    next(err);
  }
});

/** Portail élève : son propre dossier. */
router.get('/student', requireTenant, async (req, res, next) => {
  try {
    if (req.user!.role !== 'STUDENT') throw ApiError.forbidden('Réservé aux élèves');
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.id, schoolId: req.schoolId },
    });
    if (!student) throw ApiError.notFound('Dossier élève introuvable');
    const snapshot = await studentSnapshot(student.id);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

/** Portail enseignant : ses classes, son planning, ses évaluations. */
router.get('/teacher', requireTenant, async (req, res, next) => {
  try {
    if (req.user!.role !== 'TEACHER') throw ApiError.forbidden('Réservé aux enseignants');
    const teacher = await prisma.teacher.findFirst({
      where: { userId: req.user!.id, schoolId: req.schoolId },
      include: { subjects: { include: { subject: true } } },
    });
    if (!teacher) throw ApiError.notFound('Profil enseignant introuvable');

    const [timetable, assessments, mainClasses, homework] = await Promise.all([
      prisma.timetableSlot.findMany({
        where: { teacherId: teacher.id },
        include: { subject: true, class: true, classroom: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      prisma.assessment.findMany({
        where: { teacherId: teacher.id },
        include: { subject: true, class: true, _count: { select: { grades: true } } },
        orderBy: { date: 'desc' },
        take: 20,
      }),
      prisma.schoolClass.findMany({
        where: { mainTeacherId: teacher.id },
        include: {
          level: true,
          _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
        },
      }),
      prisma.homework.findMany({
        where: { teacherId: teacher.id },
        include: { subject: true, class: true },
        orderBy: { dueDate: 'desc' },
        take: 20,
      }),
    ]);

    // Classes où l'enseignant intervient (via l'emploi du temps).
    const classIds = [...new Set(timetable.map((slot) => slot.classId))];
    const classes = await prisma.schoolClass.findMany({
      where: { id: { in: classIds } },
      include: {
        level: true,
        _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
      },
    });

    res.json({
      teacher: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        subjects: teacher.subjects.map((s) => s.subject),
      },
      classes,
      mainClasses,
      timetable,
      assessments,
      homework,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
