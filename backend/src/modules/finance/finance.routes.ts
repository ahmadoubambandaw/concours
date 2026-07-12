// Finances : grilles de frais, factures, paiements (espèces, Orange Money,
// Wave, Free Money, carte, Stripe), reçus PDF, relances, dépenses, recettes.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/errors';
import { crudRouter } from '../../utils/crud';
import { nextInvoiceNumber, nextReceiptNumber } from '../../utils/numbering';
import { streamReceiptPdf } from '../../utils/pdf';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';
import { getPagination, paginated } from '../../utils/pagination';

const router = Router();

// --- Grilles de frais ---

const feeSchema = z.object({
  name: z.string().min(1),
  category: z
    .enum(['INSCRIPTION', 'SCOLARITE', 'UNIFORME', 'ASSURANCE', 'CANTINE', 'TRANSPORT', 'BIBLIOTHEQUE', 'AUTRE'])
    .default('SCOLARITE'),
  amount: z.number().int().min(0),
  frequency: z.enum(['ONCE', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  levelId: z.string().uuid().nullable().optional(),
});

router.use(
  '/fees',
  crudRouter({
    model: 'feeStructure',
    resource: 'fees',
    createSchema: feeSchema,
    updateSchema: feeSchema.partial(),
    searchFields: ['name'],
    filterFields: ['category', 'levelId'],
    include: { level: true },
    orderBy: { name: 'asc' },
  }),
);

// --- Factures ---

const invoiceCreateSchema = z.object({
  studentId: z.string().uuid(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        label: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
        unitAmount: z.number().int().min(0),
        feeStructureId: z.string().uuid().optional(),
      }),
    )
    .min(1),
});

router.get(
  '/invoices',
  requireTenant,
  requirePermission('invoices', 'read'),
  async (req, res, next) => {
    try {
      const pagination = getPagination(req);
      const where: any = { schoolId: req.schoolId };
      if (req.query.status) where.status = req.query.status;
      if (req.query.studentId) where.studentId = req.query.studentId;
      const search = String(req.query.search ?? '').trim();
      if (search) {
        where.OR = [
          { number: { contains: search, mode: 'insensitive' } },
          { student: { lastName: { contains: search, mode: 'insensitive' } } },
          { student: { matricule: { contains: search, mode: 'insensitive' } } },
        ];
      }
      const [items, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
            items: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: pagination.skip,
          take: pagination.take,
        }),
        prisma.invoice.count({ where }),
      ]);
      res.json(paginated(items, total, pagination));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/invoices',
  requireTenant,
  requirePermission('invoices', 'create'),
  async (req, res, next) => {
    try {
      const data = invoiceCreateSchema.parse(req.body);
      const student = await prisma.student.findFirst({
        where: { id: data.studentId, schoolId: req.schoolId },
      });
      if (!student) throw ApiError.notFound('Élève introuvable');

      const invoice = await prisma.$transaction(async (tx) => {
        const number = await nextInvoiceNumber(tx, req.schoolId!);
        const total = data.items.reduce((sum, i) => sum + i.unitAmount * i.quantity, 0);
        return tx.invoice.create({
          data: {
            schoolId: req.schoolId!,
            studentId: data.studentId,
            number,
            total,
            dueDate: data.dueDate,
            notes: data.notes,
            items: {
              create: data.items.map((i) => ({
                label: i.label,
                quantity: i.quantity,
                unitAmount: i.unitAmount,
                amount: i.unitAmount * i.quantity,
                feeStructureId: i.feeStructureId,
              })),
            },
          },
          include: { items: true, student: true },
        });
      });
      res.status(201).json(invoice);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/invoices/:id/cancel',
  requireTenant,
  requirePermission('invoices', 'validate'),
  async (req, res, next) => {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
      });
      if (!invoice) throw ApiError.notFound();
      if (invoice.paid > 0) throw ApiError.conflict('Facture partiellement payée : annulation impossible');
      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'CANCELLED' },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

/** Élèves en retard de paiement (pour les relances automatiques). */
router.get(
  '/invoices/overdue/list',
  requireTenant,
  requirePermission('invoices', 'read'),
  async (req, res, next) => {
    try {
      const overdue = await prisma.invoice.findMany({
        where: {
          schoolId: req.schoolId,
          status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
          dueDate: { lt: new Date() },
        },
        include: {
          student: {
            include: {
              guardians: { where: { isPrimary: true }, include: { guardian: true } },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });
      res.json(
        overdue.map((inv) => ({
          id: inv.id,
          number: inv.number,
          student: `${inv.student.firstName} ${inv.student.lastName}`,
          matricule: inv.student.matricule,
          guardianPhone: inv.student.guardians[0]?.guardian.phone ?? null,
          total: inv.total,
          paid: inv.paid,
          due: inv.total - inv.paid,
          dueDate: inv.dueDate,
          daysLate: Math.floor((Date.now() - inv.dueDate!.getTime()) / 86400000),
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// --- Paiements ---

const paymentSchema = z.object({
  studentId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  amount: z.number().int().min(1),
  method: z
    .enum(['CASH', 'ORANGE_MONEY', 'WAVE', 'FREE_MONEY', 'CARD', 'BANK_TRANSFER', 'STRIPE', 'CHEQUE'])
    .default('CASH'),
  reference: z.string().optional(),
  paidAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

router.get(
  '/payments',
  requireTenant,
  requirePermission('payments', 'read'),
  async (req, res, next) => {
    try {
      const pagination = getPagination(req);
      const where: any = { schoolId: req.schoolId };
      if (req.query.method) where.method = req.query.method;
      if (req.query.studentId) where.studentId = req.query.studentId;
      if (req.query.from || req.query.to) {
        where.paidAt = {
          ...(req.query.from ? { gte: new Date(String(req.query.from)) } : {}),
          ...(req.query.to ? { lte: new Date(String(req.query.to)) } : {}),
        };
      }
      const [items, total, sum] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
            invoice: { select: { id: true, number: true } },
          },
          orderBy: { paidAt: 'desc' },
          skip: pagination.skip,
          take: pagination.take,
        }),
        prisma.payment.count({ where }),
        prisma.payment.aggregate({ where, _sum: { amount: true } }),
      ]);
      res.json({ ...paginated(items, total, pagination), totalAmount: sum._sum.amount ?? 0 });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/payments',
  requireTenant,
  requirePermission('payments', 'create'),
  async (req, res, next) => {
    try {
      const data = paymentSchema.parse(req.body);
      const student = await prisma.student.findFirst({
        where: { id: data.studentId, schoolId: req.schoolId },
      });
      if (!student) throw ApiError.notFound('Élève introuvable');

      const payment = await prisma.$transaction(async (tx) => {
        let invoice = null;
        if (data.invoiceId) {
          invoice = await tx.invoice.findFirst({
            where: { id: data.invoiceId, schoolId: req.schoolId },
          });
          if (!invoice) throw ApiError.notFound('Facture introuvable');
          if (invoice.status === 'CANCELLED') throw ApiError.conflict('Facture annulée');
        }
        const receiptNumber = await nextReceiptNumber(tx, req.schoolId!);
        const created = await tx.payment.create({
          data: {
            schoolId: req.schoolId!,
            studentId: data.studentId,
            invoiceId: data.invoiceId,
            receiptNumber,
            amount: data.amount,
            method: data.method,
            reference: data.reference,
            paidAt: data.paidAt ?? new Date(),
            notes: data.notes,
            recordedById: req.user!.id,
          },
        });
        if (invoice) {
          const paid = invoice.paid + data.amount;
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              paid,
              status: paid >= invoice.total ? 'PAID' : 'PARTIALLY_PAID',
            },
          });
        }
        return created;
      });
      res.status(201).json(payment);
    } catch (err) {
      next(err);
    }
  },
);

/** Reçu PDF téléchargeable / imprimable. */
router.get(
  '/payments/:id/receipt',
  requireTenant,
  requirePermission('payments', 'read'),
  async (req, res, next) => {
    try {
      const payment = await prisma.payment.findFirst({
        where: { id: req.params.id, schoolId: req.schoolId },
        include: { student: true, invoice: true, school: true },
      });
      if (!payment) throw ApiError.notFound();
      streamReceiptPdf(res, {
        schoolName: payment.school.name,
        schoolAddress: payment.school.address,
        currency: payment.school.currency,
        receiptNumber: payment.receiptNumber,
        studentName: `${payment.student.firstName} ${payment.student.lastName}`,
        matricule: payment.student.matricule,
        amount: payment.amount,
        method: payment.method.replace(/_/g, ' '),
        reference: payment.reference,
        paidAt: payment.paidAt,
        invoiceNumber: payment.invoice?.number ?? null,
        balance: payment.invoice ? payment.invoice.total - payment.invoice.paid : null,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Note : les paiements en ligne (PayDunya — Orange Money, Wave, Free Money,
// carte) sont gérés par `online.routes.ts`, monté sous /finance/online.

// --- Dépenses & recettes (comptabilité de caisse) ---

const expenseSchema = z.object({
  label: z.string().min(1),
  category: z.string().default('GENERAL'),
  amount: z.number().int().min(0),
  date: z.coerce.date().optional(),
  notes: z.string().optional(),
});

router.use(
  '/expenses',
  crudRouter({
    model: 'expense',
    resource: 'expenses',
    createSchema: expenseSchema,
    updateSchema: expenseSchema.partial(),
    searchFields: ['label', 'category'],
    orderBy: { date: 'desc' },
  }),
);

router.use(
  '/incomes',
  crudRouter({
    model: 'income',
    resource: 'incomes',
    createSchema: expenseSchema,
    updateSchema: expenseSchema.partial(),
    searchFields: ['label', 'category'],
    orderBy: { date: 'desc' },
  }),
);

/** Journal de caisse : solde = paiements + recettes − dépenses. */
router.get(
  '/cashbook',
  requireTenant,
  requirePermission('accounting', 'read'),
  async (req, res, next) => {
    try {
      const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), 0, 1);
      const to = req.query.to ? new Date(String(req.query.to)) : new Date();
      const [payments, incomes, expenses] = await Promise.all([
        prisma.payment.aggregate({
          where: { schoolId: req.schoolId, status: 'COMPLETED', paidAt: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        prisma.income.aggregate({
          where: { schoolId: req.schoolId, date: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { schoolId: req.schoolId, date: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
      ]);
      const totalIn = (payments._sum.amount ?? 0) + (incomes._sum.amount ?? 0);
      const totalOut = expenses._sum.amount ?? 0;
      res.json({
        from,
        to,
        payments: payments._sum.amount ?? 0,
        otherIncomes: incomes._sum.amount ?? 0,
        expenses: totalOut,
        balance: totalIn - totalOut,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
