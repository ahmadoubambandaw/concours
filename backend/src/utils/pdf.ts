// Génération de documents PDF : reçus de paiement et bulletins de notes.
// PDFKit écrit directement dans la réponse HTTP (streaming, pas de fichier temporaire).

import PDFDocument from 'pdfkit';
import type { Response } from 'express';

export const formatMoney = (amount: number, currency = 'XOF'): string =>
  `${amount.toLocaleString('fr-FR')} ${currency === 'XOF' ? 'FCFA' : currency}`;

const formatDate = (d: Date): string =>
  d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

const header = (doc: PDFKit.PDFDocument, schoolName: string, subtitle: string) => {
  doc.fontSize(18).font('Helvetica-Bold').text(schoolName, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(12).font('Helvetica').fillColor('#555').text(subtitle, { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
  doc.moveDown(1);
  doc.fillColor('#000');
};

export interface ReceiptData {
  schoolName: string;
  schoolAddress?: string | null;
  currency: string;
  receiptNumber: string;
  studentName: string;
  matricule: string;
  amount: number;
  method: string;
  reference?: string | null;
  paidAt: Date;
  invoiceNumber?: string | null;
  balance?: number | null;
}

export const streamReceiptPdf = (res: Response, data: ReceiptData) => {
  const doc = new PDFDocument({ size: 'A5', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${data.receiptNumber}.pdf"`);
  doc.pipe(res);

  header(doc, data.schoolName, data.schoolAddress ?? 'Reçu de paiement');

  doc.fontSize(14).font('Helvetica-Bold').text(`REÇU N° ${data.receiptNumber}`);
  doc.moveDown(0.8);
  doc.fontSize(11).font('Helvetica');
  const line = (label: string, value: string) => {
    doc.font('Helvetica-Bold').text(`${label} : `, { continued: true }).font('Helvetica').text(value);
    doc.moveDown(0.3);
  };
  line('Élève', `${data.studentName} (${data.matricule})`);
  line('Date', formatDate(data.paidAt));
  line('Montant', formatMoney(data.amount, data.currency));
  line('Mode de paiement', data.method);
  if (data.reference) line('Référence', data.reference);
  if (data.invoiceNumber) line('Facture', data.invoiceNumber);
  if (data.balance !== null && data.balance !== undefined) {
    line('Reste à payer', formatMoney(data.balance, data.currency));
  }

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#777').text(
    'Document généré électroniquement par Scolaris — valable sans signature.',
    { align: 'center' },
  );
  doc.end();
};

export interface ReportCardSubjectRow {
  subject: string;
  coefficient: number;
  average: number;
  teacherComment?: string;
}

export interface ReportCardData {
  schoolName: string;
  schoolAddress?: string | null;
  academicYear: string;
  termName: string;
  studentName: string;
  matricule: string;
  className: string;
  classSize: number;
  rank: number;
  average: number;
  mention: string;
  appreciation?: string | null;
  rows: ReportCardSubjectRow[];
  signedBy?: string | null;
}

export const streamReportCardPdf = (res: Response, data: ReportCardData) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="bulletin-${data.matricule}-${data.termName.replace(/\s+/g, '-')}.pdf"`,
  );
  doc.pipe(res);

  header(doc, data.schoolName, `Bulletin de notes — ${data.termName} — ${data.academicYear}`);

  doc.fontSize(11);
  doc.font('Helvetica-Bold').text(data.studentName, { continued: true })
    .font('Helvetica').text(`   Matricule : ${data.matricule}   Classe : ${data.className}`);
  doc.moveDown(1);

  // Tableau des matières
  const startX = 50;
  const cols = [220, 60, 80, 135]; // matière, coef, moyenne, appréciation
  const headers = ['Matière', 'Coef.', 'Moyenne /20', 'Appréciation'];
  let y = doc.y;

  doc.font('Helvetica-Bold').fontSize(10);
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x + 4, y + 5, { width: cols[i] - 8 });
    x += cols[i];
  });
  doc.rect(startX, y, cols.reduce((a, b) => a + b, 0), 22).strokeColor('#999').stroke();
  y += 22;

  doc.font('Helvetica').fontSize(10);
  for (const row of data.rows) {
    const rowHeight = 20;
    if (y + rowHeight > 760) {
      doc.addPage();
      y = 50;
    }
    x = startX;
    const values = [
      row.subject,
      String(row.coefficient),
      row.average.toFixed(2),
      row.teacherComment ?? '',
    ];
    values.forEach((v, i) => {
      doc.text(v, x + 4, y + 5, { width: cols[i] - 8 });
      x += cols[i];
    });
    doc.rect(startX, y, cols.reduce((a, b) => a + b, 0), rowHeight).strokeColor('#ddd').stroke();
    y += rowHeight;
  }

  doc.moveDown(2);
  doc.y = y + 20;
  doc.fontSize(12).font('Helvetica-Bold');
  doc.text(`Moyenne générale : ${data.average.toFixed(2)} / 20`, startX);
  doc.text(`Rang : ${data.rank} / ${data.classSize}`, startX);
  doc.text(`Mention : ${data.mention}`, startX);
  if (data.appreciation) {
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Oblique').text(`Appréciation du conseil : ${data.appreciation}`, startX);
  }

  doc.moveDown(2);
  doc.fontSize(10).font('Helvetica').fillColor('#555');
  doc.text(
    data.signedBy
      ? `Signé électroniquement par ${data.signedBy} — Scolaris`
      : 'Document généré par Scolaris',
    startX,
    doc.y,
    { align: 'right' },
  );
  doc.end();
};
