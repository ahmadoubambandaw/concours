// Garde d'abonnement : limite l'accès aux modules selon la formule
// effective de l'établissement, et applique la limite d'élèves.

import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/db';
import { ApiError } from '../utils/errors';
import { effectivePlan, hasFeature, maxStudentsFor, PLANS, type Feature } from '../config/plans';

/** Récupère la formule effective de l'établissement de la requête. */
export const getEffectivePlan = async (schoolId: string) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { plan: true, planExpiresAt: true },
  });
  if (!school) throw ApiError.notFound('Établissement introuvable');
  return effectivePlan(school);
};

/** Bloque l'accès si la formule ne comprend pas la fonctionnalité. */
export const requireFeature =
  (feature: Feature) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Le SUPER_ADMIN (plateforme) n'est pas soumis aux limites de plan.
      if (req.user?.role === 'SUPER_ADMIN') return next();
      if (!req.schoolId) return next(ApiError.badRequest('Établissement non précisé'));
      const plan = await getEffectivePlan(req.schoolId);
      if (!hasFeature(plan, feature)) {
        return next(
          new ApiError(
            402, // Payment Required
            `Cette fonctionnalité nécessite une formule supérieure (actuelle : ${PLANS[plan].name}).`,
            { feature, currentPlan: plan, upgrade: true },
          ),
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };

/** Vérifie que l'établissement peut encore ajouter un élève (limite de plan). */
export const assertStudentQuota = async (schoolId: string) => {
  const plan = await getEffectivePlan(schoolId);
  const max = maxStudentsFor(plan);
  if (max === null) return; // illimité
  const count = await prisma.student.count({
    where: { schoolId, status: { not: 'INACTIVE' } },
  });
  if (count >= max) {
    throw new ApiError(
      402,
      `Limite de la formule ${PLANS[plan].name} atteinte (${max} élèves). Passez à une formule supérieure pour en ajouter davantage.`,
      { upgrade: true, currentPlan: plan, maxStudents: max },
    );
  }
};
