// Notes & bulletins : évaluations, saisie des notes en masse,
// calcul des moyennes pondérées, génération des bulletins (PDF),
// classement, mentions et délibérations de fin de période.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { crudRouter } from '../../utils/crud';
import {
  appreciationFor,
  mentionFor,
  normalizeOn20,
  rankStudents,
  weightedAverage,
} from '../../utils/academics';
import { streamReportCardPdf } from '../../utils/pdf';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';

const router = Router();

// --- Évaluations ---

const assessmentSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  teacherId: z.string().uuid().optional(),
  examId: z.string().uuid().optional(),
  title: z.string().min(1),
  type: z.enum(['CONTROLE', 'DEVOIR', 'EXAMEN', 'TP', 'ORAL']).default('DEVOIR'),
  maxScore: z.number().min(1).default(20),
  coefficient: z.number().min(0.25).max(10).default(1),
  date: z.coerce.date().optional(),
});

router.use(
  '/assessments',
  crudRouter({
    model: 'assessment',
    resource: 'assessments',
    createSchema: assessmentSchema,
    updateSchema: assessmentSchema.partial(),
    searchFields: ['title'],
    filterFields: ['classId', 'subjectId', 'termId', 'type'],
    include: {
      subject: true,
      class: true,
      term: true,
      _count: { select: { grades: true } },
    },
    orderBy: { date: 'desc' },
  }),
);

// --- Saisie des notes en masse ---

const bulkGradesSchema = z.object({
  assessmentId: z.string().uuid(),
  grades: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        score: z.number().min(0),
        comment: z.string().optional(),
      }),
    )
    .min(1),
});

router.post(
  '/grades/bulk',
  requireTenant,
  requirePermission('grades', 'create'),
  async (req, res, next) => {
    try {
      const data = bulkGradesSchema.parse(req.body);
      const assessment = await prisma.assessment.findFirst({
        where: { id: data.assessmentId, schoolId: req.schoolId },
      });
      if (!assessment) throw ApiError.notFound('Évaluation introuvable');
      const invalid = data.grades.find((g) => g.score > assessment.maxScore);
      if (invalid) {
        throw ApiError.badRequest(
          `Note ${invalid.score} supérieure au barème (${assessment.maxScore})`,
        );
      }
      const results = await prisma.$transaction(
        data.grades.map((g) =>
          prisma.grade.upsert({
            where: {
              assessmentId_studentId: { assessmentId: assessment.id, studentId: g.studentId },
            },
            update: { score: g.score, comment: g.comment },
            create: {
              schoolId: req.schoolId!,
              assessmentId: assessment.id,
              studentId: g.studentId,
              score: g.score,
              comment: g.comment,
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

/** Notes d'une évaluation (avec liste de la classe pour la saisie). */
router.get(
  '/assessments/:id/grades',
  requireTenant,
  requirePermission('grades', 'read'),
  async (req, res, next) => {
    try {
      const assessment = await prisma.assessment.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
        include: { subject: true, class: true },
      });
      if (!assessment) throw ApiError.notFound();
      const [enrollments, grades] = await Promise.all([
        prisma.enrollment.findMany({
          where: { classId: assessment.classId, status: 'ACTIVE' },
          include: {
            student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
          },
          orderBy: { student: { lastName: 'asc' } },
        }),
        prisma.grade.findMany({ where: { assessmentId: assessment.id } }),
      ]);
      const byStudent = new Map(grades.map((g) => [g.studentId, g]));
      res.json({
        assessment,
        rows: enrollments.map((e) => ({
          student: e.student,
          grade: byStudent.get(e.student.id) ?? null,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------
// Calcul des moyennes d'une classe pour une période
// ------------------------------------------------------------

interface SubjectResult {
  subjectId: string;
  subject: string;
  coefficient: number;
  average: number;
}

const computeClassResults = async (schoolId: string, classId: string, termId: string) => {
  const [assessments, enrollments] = await Promise.all([
    prisma.assessment.findMany({
      where: { schoolId, classId, termId },
      include: { subject: true, grades: true },
    }),
    prisma.enrollment.findMany({
      where: { classId, status: 'ACTIVE' },
      include: { student: true },
    }),
  ]);

  const results = enrollments.map(({ student }) => {
    // Moyenne par matière : moyenne pondérée des évaluations (coef d'évaluation),
    // puis moyenne générale pondérée par les coefficients de matière.
    const bySubject = new Map<string, { subject: any; scores: { scoreOn20: number; coefficient: number }[] }>();
    for (const assessment of assessments) {
      const grade = assessment.grades.find((g) => g.studentId === student.id);
      if (!grade) continue;
      const entry = bySubject.get(assessment.subjectId) ?? { subject: assessment.subject, scores: [] };
      entry.scores.push({
        scoreOn20: normalizeOn20(grade.score, assessment.maxScore),
        coefficient: assessment.coefficient,
      });
      bySubject.set(assessment.subjectId, entry);
    }
    const subjects: SubjectResult[] = [...bySubject.values()].map(({ subject, scores }) => ({
      subjectId: subject.id,
      subject: subject.name,
      coefficient: subject.coefficient,
      average: weightedAverage(scores),
    }));
    const average = weightedAverage(
      subjects.map((s) => ({ scoreOn20: s.average, coefficient: s.coefficient })),
    );
    return { student, subjects, average };
  });

  return rankStudents(results).map((r) => ({
    ...r,
    mention: mentionFor(r.average),
    classSize: results.length,
  }));
};

/** Résultats calculés d'une classe (aperçu avant génération des bulletins). */
router.get(
  '/results/class/:classId/term/:termId',
  requireTenant,
  requirePermission('grades', 'read'),
  async (req, res, next) => {
    try {
      const results = await computeClassResults(req.schoolId!, req.params.classId, req.params.termId);
      res.json(
        results.map((r) => ({
          student: {
            id: r.student.id,
            matricule: r.student.matricule,
            firstName: r.student.firstName,
            lastName: r.student.lastName,
          },
          subjects: r.subjects,
          average: r.average,
          rank: r.rank,
          mention: r.mention,
          classSize: r.classSize,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------
// Bulletins
// ------------------------------------------------------------

/** Génère (ou régénère) les bulletins de toute une classe pour une période. */
router.post(
  '/report-cards/generate',
  requireTenant,
  requirePermission('reportCards', 'create'),
  async (req, res, next) => {
    try {
      const { classId, termId } = z
        .object({ classId: z.string().uuid(), termId: z.string().uuid() })
        .parse(req.body);
      const term = await prisma.term.findFirst({ where: { id: termId, schoolId: req.schoolId } });
      if (!term) throw ApiError.notFound('Période introuvable');

      const results = await computeClassResults(req.schoolId!, classId, termId);
      if (results.length === 0) throw ApiError.badRequest('Aucun élève inscrit dans cette classe');

      const cards = await prisma.$transaction(
        results.map((r) =>
          prisma.reportCard.upsert({
            where: { studentId_termId: { studentId: r.student.id, termId } },
            update: {
              average: r.average,
              rank: r.rank,
              classSize: r.classSize,
              mention: r.mention,
              appreciation: appreciationFor(r.average),
              details: r.subjects as any,
            },
            create: {
              schoolId: req.schoolId!,
              studentId: r.student.id,
              termId,
              average: r.average,
              rank: r.rank,
              classSize: r.classSize,
              mention: r.mention,
              appreciation: appreciationFor(r.average),
              details: r.subjects as any,
            },
          }),
        ),
      );
      res.status(201).json({ count: cards.length });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/report-cards',
  requireTenant,
  requirePermission('reportCards', 'read'),
  async (req, res, next) => {
    try {
      const where: any = { schoolId: req.schoolId };
      if (req.query.termId) where.termId = req.query.termId;
      if (req.query.studentId) where.studentId = req.query.studentId;
      if (req.query.status) where.status = req.query.status;
      const cards = await prisma.reportCard.findMany({
        where,
        include: {
          student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
          term: { include: { academicYear: true } },
        },
        orderBy: { rank: 'asc' },
        take: 300,
      });
      res.json(cards);
    } catch (err) {
      next(err);
    }
  },
);

/** Publie les bulletins (visibles par parents/élèves) avec signature électronique. */
router.post(
  '/report-cards/publish',
  requireTenant,
  requirePermission('reportCards', 'validate'),
  async (req, res, next) => {
    try {
      const { termId, classId } = z
        .object({ termId: z.string().uuid(), classId: z.string().uuid().optional() })
        .parse(req.body);
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      const where: any = { schoolId: req.schoolId, termId };
      if (classId) {
        const enrollments = await prisma.enrollment.findMany({
          where: { classId, status: 'ACTIVE' },
          select: { studentId: true },
        });
        where.studentId = { in: enrollments.map((e) => e.studentId) };
      }
      const updated = await prisma.reportCard.updateMany({
        where,
        data: {
          status: 'PUBLISHED',
          signedBy: `${user?.firstName} ${user?.lastName}`,
          signedAt: new Date(),
        },
      });
      res.json({ count: updated.count });
    } catch (err) {
      next(err);
    }
  },
);

/** Bulletin PDF d'un élève. */
router.get(
  '/report-cards/:id/pdf',
  requireTenant,
  requirePermission('reportCards', 'read'),
  async (req, res, next) => {
    try {
      const card = await prisma.reportCard.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
        include: {
          student: {
            include: {
              enrollments: {
                where: { status: 'ACTIVE' },
                include: { class: true },
                take: 1,
              },
            },
          },
          term: { include: { academicYear: true } },
          school: true,
        },
      });
      if (!card) throw ApiError.notFound();
      streamReportCardPdf(res, {
        schoolName: card.school.name,
        schoolAddress: card.school.address,
        academicYear: card.term.academicYear.name,
        termName: card.term.name,
        studentName: `${card.student.firstName} ${card.student.lastName}`,
        matricule: card.student.matricule,
        className: card.student.enrollments[0]?.class.name ?? '—',
        classSize: card.classSize,
        rank: card.rank,
        average: card.average,
        mention: card.mention,
        appreciation: card.appreciation,
        rows: (card.details as any[]).map((d) => ({
          subject: d.subject,
          coefficient: d.coefficient,
          average: d.average,
          teacherComment: mentionFor(d.average),
        })),
        signedBy: card.signedBy,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------
// Délibérations
// ------------------------------------------------------------

/**
 * Tient la délibération d'une classe : applique les règles (seuil
 * d'admission, seuil de félicitations) sur les moyennes calculées.
 */
router.post(
  '/deliberations',
  requireTenant,
  requirePermission('deliberations', 'create'),
  async (req, res, next) => {
    try {
      const data = z
        .object({
          classId: z.string().uuid(),
          termId: z.string().uuid(),
          passThreshold: z.number().min(0).max(20).default(10),
          honorThreshold: z.number().min(0).max(20).default(16),
          notes: z.string().optional(),
          // Décisions manuelles qui priment sur la règle automatique.
          overrides: z
            .array(
              z.object({
                studentId: z.string().uuid(),
                decision: z.enum(['ADMIS', 'ADMIS_AVEC_FELICITATIONS', 'REDOUBLE', 'EXCLU', 'EN_ATTENTE']),
                comment: z.string().optional(),
              }),
            )
            .default([]),
        })
        .parse(req.body);

      const results = await computeClassResults(req.schoolId!, data.classId, data.termId);
      if (results.length === 0) throw ApiError.badRequest('Aucun résultat à délibérer');
      const overrideMap = new Map(data.overrides.map((o) => [o.studentId, o]));

      const deliberation = await prisma.deliberation.create({
        data: {
          schoolId: req.schoolId!,
          classId: data.classId,
          termId: data.termId,
          passThreshold: data.passThreshold,
          honorThreshold: data.honorThreshold,
          notes: data.notes,
          decisions: {
            create: results.map((r) => {
              const override = overrideMap.get(r.student.id);
              const autoDecision =
                r.average >= data.honorThreshold
                  ? 'ADMIS_AVEC_FELICITATIONS'
                  : r.average >= data.passThreshold
                    ? 'ADMIS'
                    : 'REDOUBLE';
              return {
                studentId: r.student.id,
                average: r.average,
                decision: override?.decision ?? (autoDecision as any),
                comment: override?.comment,
              };
            }),
          },
        },
        include: {
          decisions: {
            include: {
              student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
            },
          },
        },
      });
      res.status(201).json(deliberation);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/deliberations',
  requireTenant,
  requirePermission('deliberations', 'read'),
  async (req, res, next) => {
    try {
      const where: any = { schoolId: req.schoolId };
      if (req.query.classId) where.classId = req.query.classId;
      if (req.query.termId) where.termId = req.query.termId;
      const deliberations = await prisma.deliberation.findMany({
        where,
        include: {
          class: true,
          term: true,
          decisions: {
            include: {
              student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { heldAt: 'desc' },
      });
      res.json(deliberations);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
