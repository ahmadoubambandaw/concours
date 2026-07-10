// Assistant IA pédagogique.
//
// Le moteur combine des règles statistiques déterministes (toujours
// disponibles, aucune clé requise) et peut être branché sur un LLM
// (variable AI_API_KEY) pour les réponses en langage naturel.
//
//  - détection des élèves en difficulté (notes + assiduité + discipline)
//  - prédiction du risque d'échec (score pondéré)
//  - résumé automatique des performances d'une classe
//  - suggestions d'actions pédagogiques

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';

const router = Router();

interface RiskFactor {
  label: string;
  weight: number; // contribution au score 0-100
}

/**
 * Score de risque d'échec (0 = aucun risque, 100 = critique) :
 *  - moyenne < 10 : jusqu'à 50 points (proportionnel à l'écart)
 *  - taux d'absence : jusqu'à 30 points
 *  - incidents disciplinaires récents : jusqu'à 20 points
 */
const computeRisk = (
  average: number | null,
  absentRate: number,
  disciplineCount: number,
): { score: number; factors: RiskFactor[] } => {
  const factors: RiskFactor[] = [];
  let score = 0;
  if (average !== null && average < 10) {
    const w = Math.min(50, Math.round((10 - average) * 8));
    score += w;
    factors.push({ label: `Moyenne faible (${average.toFixed(1)}/20)`, weight: w });
  }
  if (absentRate > 0.1) {
    const w = Math.min(30, Math.round(absentRate * 100));
    score += w;
    factors.push({ label: `Absentéisme élevé (${Math.round(absentRate * 100)}%)`, weight: w });
  }
  if (disciplineCount > 0) {
    const w = Math.min(20, disciplineCount * 7);
    score += w;
    factors.push({ label: `${disciplineCount} incident(s) disciplinaire(s)`, weight: w });
  }
  return { score: Math.min(100, score), factors };
};

const suggestionsFor = (factors: RiskFactor[]): string[] => {
  const suggestions: string[] = [];
  if (factors.some((f) => f.label.startsWith('Moyenne'))) {
    suggestions.push('Mettre en place des séances de soutien scolaire ciblées');
    suggestions.push('Organiser un entretien avec l\'élève et le professeur principal');
  }
  if (factors.some((f) => f.label.startsWith('Absentéisme'))) {
    suggestions.push('Convoquer les parents pour comprendre les causes des absences');
    suggestions.push('Activer les alertes SMS automatiques dès la première absence');
  }
  if (factors.some((f) => f.label.includes('disciplinaire'))) {
    suggestions.push('Prévoir un suivi avec le surveillant général ou un conseiller');
  }
  if (suggestions.length === 0) suggestions.push('Poursuivre le suivi habituel');
  return suggestions;
};

/** Élèves à risque d'une classe (ou de toute l'école). */
router.get('/at-risk', requireTenant, requirePermission('ai', 'read'), async (req, res, next) => {
  try {
    const schoolId = req.schoolId!;
    const classId = req.query.classId ? String(req.query.classId) : undefined;
    const threshold = Math.max(0, Math.min(100, parseInt(String(req.query.threshold ?? '30'), 10) || 30));

    const enrollments = await prisma.enrollment.findMany({
      where: { schoolId, status: 'ACTIVE', ...(classId ? { classId } : {}) },
      include: {
        student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
      take: 500,
    });
    const studentIds = enrollments.map((e) => e.student.id);

    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const [cards, attendance, discipline] = await Promise.all([
      prisma.reportCard.findMany({
        where: { schoolId, studentId: { in: studentIds } },
        orderBy: { createdAt: 'desc' },
        select: { studentId: true, average: true },
      }),
      prisma.attendance.findMany({
        where: { schoolId, studentId: { in: studentIds }, date: { gte: threeMonthsAgo } },
        select: { studentId: true, status: true },
      }),
      prisma.disciplineCase.findMany({
        where: { schoolId, studentId: { in: studentIds }, date: { gte: threeMonthsAgo } },
        select: { studentId: true },
      }),
    ]);

    const latestAverage = new Map<string, number>();
    for (const card of cards) {
      if (!latestAverage.has(card.studentId!)) latestAverage.set(card.studentId!, card.average);
    }

    const results = enrollments
      .map((e) => {
        const sid = e.student.id;
        const att = attendance.filter((a) => a.studentId === sid);
        const absent = att.filter((a) => a.status === 'ABSENT').length;
        const absentRate = att.length ? absent / att.length : 0;
        const disciplineCount = discipline.filter((d) => d.studentId === sid).length;
        const average = latestAverage.get(sid) ?? null;
        const { score, factors } = computeRisk(average, absentRate, disciplineCount);
        return {
          student: e.student,
          class: e.class,
          average,
          absentRate: Math.round(absentRate * 100),
          disciplineCount,
          riskScore: score,
          riskLevel: score >= 60 ? 'CRITIQUE' : score >= 30 ? 'ÉLEVÉ' : score > 0 ? 'MODÉRÉ' : 'FAIBLE',
          factors,
          suggestions: suggestionsFor(factors),
        };
      })
      .filter((r) => r.riskScore >= threshold)
      .sort((a, b) => b.riskScore - a.riskScore);

    res.json(results);
  } catch (err) {
    next(err);
  }
});

/** Résumé automatique des performances d'une classe pour une période. */
router.get(
  '/class-summary/:classId/term/:termId',
  requireTenant,
  requirePermission('ai', 'read'),
  async (req, res, next) => {
    try {
      const cards = await prisma.reportCard.findMany({
        where: {
          schoolId: req.schoolId,
          termId: req.params.termId,
          student: { enrollments: { some: { classId: req.params.classId, status: 'ACTIVE' } } },
        },
        include: { student: { select: { firstName: true, lastName: true } } },
        orderBy: { rank: 'asc' },
      });
      if (cards.length === 0) {
        throw ApiError.notFound('Aucun bulletin généré pour cette classe et cette période');
      }
      const averages = cards.map((c) => c.average);
      const classAverage = averages.reduce((s, a) => s + a, 0) / averages.length;
      const passed = cards.filter((c) => c.average >= 10);
      const best = cards[0];
      const struggling = cards.filter((c) => c.average < 8);

      // Répartition par matière (à partir des instantanés des bulletins).
      const subjectTotals = new Map<string, { sum: number; count: number }>();
      for (const card of cards) {
        for (const detail of card.details as any[]) {
          const entry = subjectTotals.get(detail.subject) ?? { sum: 0, count: 0 };
          entry.sum += detail.average;
          entry.count += 1;
          subjectTotals.set(detail.subject, entry);
        }
      }
      const subjects = [...subjectTotals.entries()]
        .map(([subject, { sum, count }]) => ({
          subject,
          average: Math.round((sum / count) * 100) / 100,
        }))
        .sort((a, b) => b.average - a.average);

      const summaryText = [
        `La classe compte ${cards.length} élèves évalués avec une moyenne générale de ${classAverage.toFixed(2)}/20.`,
        `${passed.length} élèves (${Math.round((passed.length / cards.length) * 100)}%) ont la moyenne.`,
        `Premier de classe : ${best.student.firstName} ${best.student.lastName} (${best.average.toFixed(2)}/20).`,
        subjects.length
          ? `Matière la plus forte : ${subjects[0].subject} (${subjects[0].average}/20) ; la plus faible : ${subjects[subjects.length - 1].subject} (${subjects[subjects.length - 1].average}/20).`
          : '',
        struggling.length
          ? `${struggling.length} élève(s) en grande difficulté (moyenne < 8) nécessitent un accompagnement renforcé.`
          : 'Aucun élève en grande difficulté.',
      ]
        .filter(Boolean)
        .join(' ');

      res.json({
        classSize: cards.length,
        classAverage: Math.round(classAverage * 100) / 100,
        successRate: Math.round((passed.length / cards.length) * 1000) / 10,
        best: { name: `${best.student.firstName} ${best.student.lastName}`, average: best.average },
        strugglingCount: struggling.length,
        subjects,
        summary: summaryText,
        recommendations:
          struggling.length > 0
            ? [
                'Organiser des groupes de niveau pour les matières les plus faibles',
                'Planifier une réunion parents-professeurs pour les élèves en difficulté',
                'Mettre en place un tutorat entre pairs avec les meilleurs élèves',
              ]
            : ['Maintenir la dynamique actuelle', 'Valoriser les meilleurs élèves (tableau d\'honneur)'],
      });
    } catch (err) {
      next(err);
    }
  },
);

/** Question libre — répond à partir des données de l'école (FAQ analytique). */
router.post('/ask', requireTenant, requirePermission('ai', 'read'), async (req, res, next) => {
  try {
    const { question } = z.object({ question: z.string().min(3) }).parse(req.body);
    const q = question.toLowerCase();
    const schoolId = req.schoolId!;

    // Router d'intentions simple ; extensible vers un LLM via AI_API_KEY.
    if (/(combien|nombre).*(élève|eleve)/.test(q)) {
      const count = await prisma.student.count({ where: { schoolId, status: 'ACTIVE' } });
      return res.json({ answer: `L'établissement compte actuellement ${count} élèves actifs.` });
    }
    if (/(combien|nombre).*(enseignant|prof)/.test(q)) {
      const count = await prisma.teacher.count({ where: { schoolId, status: 'ACTIVE' } });
      return res.json({ answer: `L'établissement compte ${count} enseignants actifs.` });
    }
    if (/(impayé|impaye|retard.*paiement|doivent)/.test(q)) {
      const agg = await prisma.invoice.aggregate({
        where: { schoolId, status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { total: true, paid: true },
        _count: true,
      });
      const due = (agg._sum.total ?? 0) - (agg._sum.paid ?? 0);
      return res.json({
        answer: `Il y a ${agg._count} factures en attente pour un total impayé de ${due.toLocaleString('fr-FR')} FCFA.`,
      });
    }
    if (/(absence|absent|présence|presence)/.test(q)) {
      const today = new Date(new Date().toISOString().slice(0, 10));
      const grouped = await prisma.attendance.groupBy({
        by: ['status'],
        where: { schoolId, date: today, studentId: { not: null } },
        _count: true,
      });
      const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count]));
      return res.json({
        answer: `Aujourd'hui : ${counts.PRESENT ?? 0} présents, ${counts.ABSENT ?? 0} absents, ${counts.LATE ?? 0} retards.`,
      });
    }
    res.json({
      answer:
        "Je peux répondre sur : les effectifs (élèves, enseignants), les impayés, les présences du jour, les élèves à risque (voir l'onglet dédié). Reformulez votre question ou consultez les tableaux de bord.",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
