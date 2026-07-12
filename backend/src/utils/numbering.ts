// Numérotation automatique : matricules, factures, reçus.
// Les numéros sont séquentiels par école et par année pour rester lisibles.

import type { Prisma, PrismaClient } from '@prisma/client';

type Tx = Prisma.TransactionClient | PrismaClient;

const pad = (n: number, width: number) => String(n).padStart(width, '0');

/** Matricule élève : <CODE ECOLE>-<ANNEE>-<SEQ 5> — ex: SLD-2026-00042 */
export const nextMatricule = async (tx: Tx, schoolId: string, schoolCode: string): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `${schoolCode.toUpperCase()}-${year}-`;
  const last = await tx.student.findFirst({
    where: { schoolId, matricule: { startsWith: prefix } },
    orderBy: { matricule: 'desc' },
    select: { matricule: true },
  });
  const lastSeq = last ? parseInt(last.matricule.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${pad(lastSeq + 1, 5)}`;
};

/** Numéro de facture : FAC-<ANNEE>-<SEQ 5> */
export const nextInvoiceNumber = async (tx: Tx, schoolId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  const last = await tx.invoice.findFirst({
    where: { schoolId, number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const lastSeq = last ? parseInt(last.number.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${pad(lastSeq + 1, 5)}`;
};

/** Numéro de reçu : REC-<ANNEE>-<SEQ 5> */
export const nextReceiptNumber = async (tx: Tx, schoolId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;
  const last = await tx.payment.findFirst({
    where: { schoolId, receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  });
  const lastSeq = last ? parseInt(last.receiptNumber.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${pad(lastSeq + 1, 5)}`;
};
