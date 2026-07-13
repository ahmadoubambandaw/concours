// Abonnements : formules, statut courant, souscription (PayDunya) et
// activation via webhook.
//
// - GET  /subscription/plans          (public)  : grille tarifaire
// - POST /subscription/webhook        (public)  : IPN PayDunya → activation
// - GET  /subscription/current        (authed)  : formule + usage de l'école
// - POST /subscription/checkout       (authed)  : souscrire un plan payant

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { ApiError } from '../../utils/errors';
import { parseBody } from '../../utils/validate';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';
import {
  effectivePlan,
  maxStudentsFor,
  PLANS,
  PLAN_ORDER,
  priceFor,
} from '../../config/plans';
import { createCheckoutInvoice, confirmInvoice } from '../../services/paydunya';

// ------------------------------------------------------------------
// Routes publiques (grille + webhook)
// ------------------------------------------------------------------
export const publicSubscriptionRouter = Router();

publicSubscriptionRouter.get('/plans', (_req, res) => {
  res.json({ plans: PLAN_ORDER.map((k) => PLANS[k]) });
});

/** Active un abonnement après confirmation du paiement (idempotent). */
const activateFromToken = async (token: string) => {
  const confirmation = await confirmInvoice(token);
  if (confirmation.status !== 'completed') return { activated: false, status: confirmation.status };

  const { type, schoolId, plan, cycle, months } = confirmation.customData as any;
  if (type !== 'subscription' || !schoolId || !plan) {
    return { activated: false, status: 'missing_custom_data' as const };
  }

  // Déjà traité ?
  const existing = await prisma.subscription.findFirst({
    where: { schoolId, reference: token, status: 'ACTIVE' },
    select: { id: true },
  });
  if (existing) return { activated: true, status: 'completed' as const };

  const monthsN = parseInt(String(months ?? '1'), 10) || 1;
  const now = new Date();
  const expiresAt = new Date(now.getTime());
  expiresAt.setMonth(expiresAt.getMonth() + monthsN);

  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { schoolId, reference: token },
      data: { status: 'ACTIVE', startsAt: now, expiresAt },
    }),
    prisma.school.update({
      where: { id: schoolId },
      data: { plan, planExpiresAt: expiresAt, status: 'ACTIVE' },
    }),
  ]);
  return { activated: true, status: 'completed' as const };
};

publicSubscriptionRouter.post('/webhook', async (req, res) => {
  try {
    const token: string | undefined =
      req.body?.data?.token ?? req.body?.token ?? req.body?.['data[token]'];
    if (!token) return res.status(400).json({ error: 'Token manquant' });
    await activateFromToken(token);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[subscription:webhook]', err);
    res.status(200).json({ received: true });
  }
});

// ------------------------------------------------------------------
// Routes authentifiées
// ------------------------------------------------------------------
const router = Router();

router.get('/current', requireTenant, async (req, res, next) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { plan: true, planExpiresAt: true, status: true, currency: true },
    });
    if (!school) throw ApiError.notFound();
    const plan = effectivePlan(school);
    const [students, subscriptions] = await Promise.all([
      prisma.student.count({ where: { schoolId: req.schoolId, status: { not: 'INACTIVE' } } }),
      prisma.subscription.findMany({
        where: { schoolId: req.schoolId },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
    ]);
    const max = maxStudentsFor(plan);
    res.json({
      plan,
      planDetails: PLANS[plan],
      subscribedPlan: school.plan,
      planExpiresAt: school.planExpiresAt,
      // Est-on en période d'essai en cours (formule Premium offerte, non
      // encore expirée, sans souscription payante active) ?
      isTrial:
        school.plan !== 'DECOUVERTE' &&
        !!school.planExpiresAt &&
        school.planExpiresAt.getTime() > Date.now() &&
        subscriptions.every((s) => s.status !== 'ACTIVE'),
      // L'essai a-t-il expiré sans souscription (l'établissement est
      // redescendu en Découverte et doit choisir une formule) ?
      trialExpired:
        !!school.planExpiresAt &&
        school.planExpiresAt.getTime() <= Date.now() &&
        subscriptions.every((s) => s.status !== 'ACTIVE'),
      usage: { students, maxStudents: max, studentsRemaining: max === null ? null : Math.max(0, max - students) },
      currency: school.currency,
      history: subscriptions,
    });
  } catch (err) {
    next(err);
  }
});

const checkoutSchema = z.object({
  plan: z.enum(['STANDARD', 'PREMIUM']),
  cycle: z.enum(['MONTHLY', 'ANNUAL']),
});

router.post(
  '/checkout',
  requireTenant,
  requirePermission('settings', 'update'),
  async (req, res, next) => {
    try {
      if (!env.paydunya.configured) {
        throw ApiError.badRequest(
          "Le paiement en ligne n'est pas configuré. Renseignez les clés PayDunya pour activer les abonnements payants.",
        );
      }
      const { plan, cycle } = parseBody(req, checkoutSchema);
      const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
      if (!school) throw ApiError.notFound();

      const { amount, months } = priceFor(plan, cycle);
      if (amount <= 0) throw ApiError.badRequest('Cette formule est gratuite');

      // Enregistre la souscription en attente puis lance le paiement.
      const sub = await prisma.subscription.create({
        data: { schoolId: school.id, plan, cycle, amount, months, status: 'PENDING' },
      });

      const apiBase = env.publicApiUrl.replace(/\/$/, '');
      const webBase = env.publicWebUrl.replace(/\/$/, '');
      const checkout = await createCheckoutInvoice({
        totalAmount: amount,
        currency: school.currency,
        description: `Abonnement Scolaris ${PLANS[plan].name} (${cycle === 'ANNUAL' ? 'annuel' : 'mensuel'}) — ${school.name}`,
        storeName: 'Scolaris',
        callbackUrl: `${apiBase}/api/v1/subscription/webhook`,
        returnUrl: `${webBase}/abonnement/retour`,
        cancelUrl: `${webBase}/abonnement/retour?annule=1`,
        customData: {
          type: 'subscription',
          schoolId: school.id,
          plan,
          cycle,
          months: String(months),
          subscriptionId: sub.id,
        },
      });

      // Relie le token à la souscription (référence de réconciliation).
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { reference: checkout.token },
      });

      res.json({ checkoutUrl: checkout.checkoutUrl, token: checkout.token, amount });
    } catch (err) {
      next(err);
    }
  },
);

/** Statut d'une souscription (page de retour) — confirme au besoin. */
router.get('/status/:token', requireTenant, async (req, res, next) => {
  try {
    const token = req.params.token;
    const sub = await prisma.subscription.findFirst({
      where: { reference: token, schoolId: req.schoolId },
    });
    if (sub?.status === 'ACTIVE') return res.json({ status: 'active', subscription: sub });
    if (!env.paydunya.configured) return res.json({ status: 'unknown' });
    const result = await activateFromToken(token);
    if (result.activated) {
      const updated = await prisma.subscription.findFirst({ where: { reference: token } });
      return res.json({ status: 'active', subscription: updated });
    }
    res.json({ status: result.status });
  } catch (err) {
    next(err);
  }
});

export default router;
