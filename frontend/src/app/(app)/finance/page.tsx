'use client';

// Paiements & factures : encaissement (espèces, mobile money, carte),
// reçus PDF, factures et relances des impayés.

import { useCallback, useEffect, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { api, apiDownload, authStore } from '@/lib/api';
import { Card, CardHeader, DataTable, Field, Modal, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { formatDate, formatMoney, PAYMENT_METHOD_LABELS } from '@/lib/format';

export default function FinancePage() {
  const [tab, setTab] = useState<'payments' | 'invoices' | 'overdue'>('payments');
  const [payments, setPayments] = useState<any>(null);
  const [invoices, setInvoices] = useState<any>(null);
  const [overdue, setOverdue] = useState<any[] | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [studentInvoices, setStudentInvoices] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ method: 'CASH', amount: '' });
  const [error, setError] = useState('');
  const currency = authStore.school?.currency ?? 'XOF';

  const load = useCallback(() => {
    api('/finance/payments?pageSize=25').then(setPayments).catch((e) => setError(e.message));
    api('/finance/invoices?pageSize=25').then(setInvoices).catch(() => undefined);
    api('/finance/invoices/overdue/list').then(setOverdue).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const openPay = async () => {
    setShowPay(true);
    const s = await api('/students?pageSize=100');
    setStudents(s.items);
  };

  const selectStudent = async (studentId: string) => {
    setForm({ ...form, studentId, invoiceId: '' });
    if (studentId) {
      const inv = await api(`/finance/invoices?studentId=${studentId}&pageSize=20`);
      setStudentInvoices(inv.items.filter((i: any) => !['PAID', 'CANCELLED'].includes(i.status)));
    }
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api('/finance/payments', {
        method: 'POST',
        body: JSON.stringify({
          studentId: form.studentId,
          invoiceId: form.invoiceId || undefined,
          amount: parseInt(form.amount, 10),
          method: form.method,
          reference: form.reference || undefined,
        }),
      });
      setShowPay(false);
      setForm({ method: 'CASH', amount: '' });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const TABS = [
    { key: 'payments', label: `Paiements${payments ? ` (${payments.total})` : ''}` },
    { key: 'invoices', label: `Factures${invoices ? ` (${invoices.total})` : ''}` },
    { key: 'overdue', label: `Impayés en retard${overdue ? ` (${overdue.length})` : ''}` },
  ] as const;

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Paiements & factures"
        subtitle={payments ? `Total encaissé (page) : ${formatMoney(payments.totalAmount, currency)}` : undefined}
        actions={<button className="btn-primary" onClick={openPay}><Plus size={16} /> Encaisser un paiement</button>}
      />

      <div className="mb-4 flex gap-1 rounded-lg border p-1 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)', width: 'fit-content' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 transition-colors ${tab === t.key ? 'bg-brand-600 font-medium text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {tab === 'payments' && (!payments ? <Spinner /> : (
          <DataTable
            columns={[
              { key: 'receiptNumber', header: 'Reçu', render: (p: any) => <span className="font-medium">{p.receiptNumber}</span> },
              { key: 'student', header: 'Élève', render: (p: any) => `${p.student.lastName} ${p.student.firstName}` },
              { key: 'paidAt', header: 'Date', render: (p: any) => formatDate(p.paidAt) },
              { key: 'amount', header: 'Montant', render: (p: any) => <span className="font-medium tabular-nums">{formatMoney(p.amount, currency)}</span> },
              { key: 'method', header: 'Mode', render: (p: any) => PAYMENT_METHOD_LABELS[p.method] ?? p.method },
              {
                key: 'pdf', header: 'Reçu PDF',
                render: (p: any) => (
                  <button className="btn-secondary !px-2.5 !py-1.5" onClick={(e) => { e.stopPropagation(); apiDownload(`/finance/payments/${p.id}/receipt`, `${p.receiptNumber}.pdf`); }}>
                    <Download size={14} />
                  </button>
                ),
              },
            ]}
            rows={payments.items}
            emptyLabel="Aucun paiement"
          />
        ))}
        {tab === 'invoices' && (!invoices ? <Spinner /> : (
          <DataTable
            columns={[
              { key: 'number', header: 'N°', render: (i: any) => <span className="font-medium">{i.number}</span> },
              { key: 'student', header: 'Élève', render: (i: any) => `${i.student.lastName} ${i.student.firstName}` },
              { key: 'total', header: 'Total', render: (i: any) => <span className="tabular-nums">{formatMoney(i.total, currency)}</span> },
              { key: 'paid', header: 'Payé', render: (i: any) => <span className="tabular-nums">{formatMoney(i.paid, currency)}</span> },
              { key: 'due', header: 'Reste', render: (i: any) => <span className="font-medium tabular-nums">{formatMoney(i.total - i.paid, currency)}</span> },
              { key: 'dueDate', header: 'Échéance', render: (i: any) => formatDate(i.dueDate) },
              { key: 'status', header: 'Statut', render: (i: any) => <StatusBadge status={i.status} /> },
            ]}
            rows={invoices.items}
            emptyLabel="Aucune facture"
          />
        ))}
        {tab === 'overdue' && (!overdue ? <Spinner /> : (
          <DataTable
            columns={[
              { key: 'number', header: 'Facture' },
              { key: 'student', header: 'Élève' },
              { key: 'guardianPhone', header: 'Tél. parent', render: (o: any) => o.guardianPhone ?? '—' },
              { key: 'due', header: 'Reste dû', render: (o: any) => <span className="font-medium tabular-nums text-red-600 dark:text-red-400">{formatMoney(o.due, currency)}</span> },
              { key: 'daysLate', header: 'Retard', render: (o: any) => `${o.daysLate} j` },
            ]}
            rows={overdue}
            emptyLabel="Aucun impayé en retard 🎉"
          />
        ))}
      </Card>

      <Modal open={showPay} onClose={() => setShowPay(false)} title="Encaisser un paiement">
        <form onSubmit={pay} className="space-y-4">
          <Field label="Élève" required>
            <select required className="input" value={form.studentId ?? ''} onChange={(e) => selectStudent(e.target.value)}>
              <option value="">Choisir…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName} — {s.matricule}</option>)}
            </select>
          </Field>
          {studentInvoices.length > 0 && (
            <Field label="Facture à imputer">
              <select className="input" value={form.invoiceId ?? ''} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
                <option value="">Paiement libre</option>
                {studentInvoices.map((i) => (
                  <option key={i.id} value={i.id}>{i.number} — reste {formatMoney(i.total - i.paid, currency)}</option>
                ))}
              </select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Montant" required>
              <input type="number" min={1} required className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label="Mode de paiement" required>
              <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          {form.method !== 'CASH' && (
            <Field label="Référence de transaction">
              <input className="input" value={form.reference ?? ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="ID transaction Wave / OM…" />
            </Field>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Encaisser et générer le reçu</button>
        </form>
      </Modal>
    </div>
  );
}
