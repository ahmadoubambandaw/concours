// Exports CSV (compatibles Excel) : élèves, paiements, présences, notes.

import { Router } from 'express';
import { prisma } from '../../config/db';
import { requirePermission, requireTenant } from '../../middleware/auth.middleware';

const router = Router();

const toCsv = (headers: string[], rows: (string | number | null | undefined)[][]): string => {
  const escape = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM UTF-8 pour l'ouverture directe dans Excel ; séparateur ';' (locale FR).
  return '﻿' + [headers, ...rows].map((r) => r.map(escape).join(';')).join('\n');
};

const sendCsv = (res: any, filename: string, csv: string) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

router.get('/students.csv', requireTenant, requirePermission('reports', 'read'), async (req, res, next) => {
  try {
    const students = await prisma.student.findMany({
      where: { schoolId: req.schoolId, status: 'ACTIVE' },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { class: true },
          take: 1,
          orderBy: { enrolledAt: 'desc' },
        },
        guardians: { where: { isPrimary: true }, include: { guardian: true } },
      },
      orderBy: { lastName: 'asc' },
    });
    const csv = toCsv(
      ['Matricule', 'Nom', 'Prénom', 'Sexe', 'Date de naissance', 'Classe', 'Tuteur', 'Téléphone tuteur'],
      students.map((s) => [
        s.matricule,
        s.lastName,
        s.firstName,
        s.gender,
        s.birthDate.toISOString().slice(0, 10),
        s.enrollments[0]?.class.name ?? '',
        s.guardians[0] ? `${s.guardians[0].guardian.firstName} ${s.guardians[0].guardian.lastName}` : '',
        s.guardians[0]?.guardian.phone ?? '',
      ]),
    );
    sendCsv(res, 'eleves.csv', csv);
  } catch (err) {
    next(err);
  }
});

router.get('/payments.csv', requireTenant, requirePermission('reports', 'read'), async (req, res, next) => {
  try {
    const where: any = { schoolId: req.schoolId, status: 'COMPLETED' };
    if (req.query.from || req.query.to) {
      where.paidAt = {
        ...(req.query.from ? { gte: new Date(String(req.query.from)) } : {}),
        ...(req.query.to ? { lte: new Date(String(req.query.to)) } : {}),
      };
    }
    const payments = await prisma.payment.findMany({
      where,
      include: { student: true, invoice: true },
      orderBy: { paidAt: 'desc' },
    });
    const csv = toCsv(
      ['Reçu', 'Date', 'Élève', 'Matricule', 'Montant', 'Mode', 'Référence', 'Facture'],
      payments.map((p) => [
        p.receiptNumber,
        p.paidAt.toISOString().slice(0, 10),
        `${p.student.firstName} ${p.student.lastName}`,
        p.student.matricule,
        p.amount,
        p.method,
        p.reference ?? '',
        p.invoice?.number ?? '',
      ]),
    );
    sendCsv(res, 'paiements.csv', csv);
  } catch (err) {
    next(err);
  }
});

router.get('/results.csv', requireTenant, requirePermission('reports', 'read'), async (req, res, next) => {
  try {
    const where: any = { schoolId: req.schoolId };
    if (req.query.termId) where.termId = req.query.termId;
    const cards = await prisma.reportCard.findMany({
      where,
      include: { student: true, term: { include: { academicYear: true } } },
      orderBy: [{ termId: 'asc' }, { rank: 'asc' }],
    });
    const csv = toCsv(
      ['Année', 'Période', 'Matricule', 'Nom', 'Prénom', 'Moyenne', 'Rang', 'Effectif', 'Mention'],
      cards.map((c) => [
        c.term.academicYear.name,
        c.term.name,
        c.student.matricule,
        c.student.lastName,
        c.student.firstName,
        c.average,
        c.rank,
        c.classSize,
        c.mention,
      ]),
    );
    sendCsv(res, 'resultats.csv', csv);
  } catch (err) {
    next(err);
  }
});

export default router;
