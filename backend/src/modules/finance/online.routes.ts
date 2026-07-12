// Paiements en ligne via PayDunya (Orange Money, Wave, Free Money, carte).
//
// - POST /finance/online/checkout : crée un paiement PayDunya et renvoie
//   l'URL de redirection. Un parent ne peut régler que les factures de
//   ses propres enfants.
// - POST /finance/online/webhook  : callback IPN public de PayDunya ;
//   confirme le statut réel puis enregistre le paiement (idempotent).
// - GET  /finance/online/status/:token : suivi côté page de retour.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { ApiError } from '../../utils/errors';
import { parseBody } from '../../utils/validate';
import { nextReceiptNumber } from '../../utils/numbering';
import { hasPermission } from '../../auth/permissions';
import { authenticate, requireTenant } from '../../middleware/auth.middleware';
import { confirmInvoice, createCheckoutInvoice } from '../../services/paydunya';

const router = Router();

/** Vérifie qu'un parent est bien rattaché à l'élève de la facture. */
const parentOwnsInvoice = async (userId: string, studentId: string): Promise<boolean> => {
  const link = await prisma.studentGuardian.findFirst({
    where: { studentId, guardian: { userId } },
    select: { studentId: true },
  });
  return Boolean(link);
};

// ------------------------------------------------------------------
// Démarrer un paiement
// ------------------------------------------------------------------
router.post('/checkout', authenticate, requireTenant, async (req, res, next) => {
  try {
    if (!env.paydunya.configured) {
      throw ApiError.badRequest(
        "Le paiement en ligne n'est pas configuré. Renseignez les clés PayDunya dans les variables d'environnement.",
      );
    }
    const { invoiceId } = parseBody(req, z.object({ invoiceId: z.string().uuid() }));

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId: req.schoolId },
      include: { student: true, school: true },
    });
    if (!invoice) throw ApiError.notFound('Facture introuvable');
    if (invoice.status === 'CANCELLED') throw ApiError.conflict('Facture annulée');
    if (invoice.status === 'PAID') throw ApiError.conflict('Facture déjà réglée');

    // Contrôle d'accès : parent = uniquement ses enfants ; personnel = droit payments:create.
    const role = req.user!.role;
    if (role === 'PARENT' || role === 'STUDENT') {
      const owns =
        role === 'PARENT'
          ? await parentOwnsInvoice(req.user!.id, invoice.studentId)
          : (await prisma.student.findFirst({
              where: { id: invoice.studentId, userId: req.user!.id },
              select: { id: true },
            })) !== null;
      if (!owns) throw ApiError.forbidden('Cette facture ne vous concerne pas');
    } else if (!hasPermission(role, 'payments', 'create', req.user!.permissionOverrides)) {
      throw ApiError.forbidden('Permission requise : payments:create');
    }

    const due = invoice.total - invoice.paid;
    if (due <= 0) throw ApiError.conflict('Aucun montant restant à payer');

    const apiBase = `${env.publicApiUrl.replace(/\/$/, '')}`;
    const checkout = await createCheckoutInvoice({
      totalAmount: due,
      currency: invoice.school.currency,
      description: `Scolarité ${invoice.number} — ${invoice.student.firstName} ${invoice.student.lastName}`,
      storeName: invoice.school.name,
      callbackUrl: `${apiBase}/api/v1/finance/online/webhook`,
      returnUrl: `${env.publicWebUrl.replace(/\/$/, '')}/paiement/retour`,
      cancelUrl: `${env.publicWebUrl.replace(/\/$/, '')}/paiement/retour?annule=1`,
      customData: {
        schoolId: invoice.schoolId,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
      },
    });

    res.json({ checkoutUrl: checkout.checkoutUrl, token: checkout.token, amount: due });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------
// Callback IPN PayDunya (public — aucune authentification)
// ------------------------------------------------------------------
// Enregistre le paiement de façon idempotente : le token PayDunya sert
// de référence unique, une seconde notification ne crée pas de doublon.
const recordPaidToken = async (token: string) => {
  const confirmation = await confirmInvoice(token);
  if (confirmation.status !== 'completed') return { recorded: false, status: confirmation.status };

  const { schoolId, invoiceId, studentId } = confirmation.customData;
  if (!schoolId || !invoiceId || !studentId) {
    return { recorded: false, status: 'missing_custom_data' as const };
  }

  // Déjà enregistré ? (idempotence)
  const existing = await prisma.payment.findFirst({
    where: { schoolId, reference: token },
    select: { id: true },
  });
  if (existing) return { recorded: true, status: 'completed' as const, paymentId: existing.id };

  const payment = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, schoolId } });
    if (!invoice) throw new Error('Facture introuvable pour ce paiement');

    const receiptNumber = await nextReceiptNumber(tx, schoolId);
    const created = await tx.payment.create({
      data: {
        schoolId,
        studentId,
        invoiceId,
        receiptNumber,
        amount: confirmation.totalAmount,
        method: 'ORANGE_MONEY', // agrégateur PayDunya (OM/Wave/Free/carte)
        reference: token,
        status: 'COMPLETED',
        notes: 'Paiement en ligne PayDunya',
      },
    });
    const paid = invoice.paid + confirmation.totalAmount;
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { paid, status: paid >= invoice.total ? 'PAID' : 'PARTIALLY_PAID' },
    });
    return created;
  });

  return { recorded: true, status: 'completed' as const, paymentId: payment.id };
};

router.post('/webhook', async (req, res) => {
  try {
    // PayDunya poste les données sous `data` (JSON ou urlencoded).
    const token: string | undefined =
      req.body?.data?.token ?? req.body?.token ?? req.body?.['data[token]'];
    if (!token) return res.status(400).json({ error: 'Token manquant' });
    await recordPaidToken(token);
    // PayDunya attend un 200 pour cesser de renvoyer la notification.
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[paydunya:webhook]', err);
    // On renvoie 200 pour éviter les renvois en boucle ; le paiement
    // sera de toute façon confirmable via /status.
    res.status(200).json({ received: true });
  }
});

// ------------------------------------------------------------------
// Statut d'un paiement (page de retour) — confirme au besoin
// ------------------------------------------------------------------
router.get('/status/:token', authenticate, async (req, res, next) => {
  try {
    const token = req.params.token;
    const existing = await prisma.payment.findFirst({
      where: { reference: token, schoolId: req.schoolId ?? undefined },
      select: { id: true, receiptNumber: true, amount: true },
    });
    if (existing) return res.json({ status: 'completed', payment: existing });

    // Pas encore enregistré via l'IPN : on confirme activement.
    if (!env.paydunya.configured) return res.json({ status: 'unknown' });
    const result = await recordPaidToken(token);
    if (result.recorded) {
      const payment = await prisma.payment.findFirst({
        where: { reference: token },
        select: { id: true, receiptNumber: true, amount: true },
      });
      return res.json({ status: 'completed', payment });
    }
    res.json({ status: result.status });
  } catch (err) {
    next(err);
  }
});

export default router;
