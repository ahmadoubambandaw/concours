'use client';

// Comptabilité : journal de caisse, dépenses et recettes.

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { Card, CardHeader, DataTable, Field, Modal, PageHeader, Spinner } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';

export default function AccountingPage() {
  const [cashbook, setCashbook] = useState<any>(null);
  const [expenses, setExpenses] = useState<any>(null);
  const [incomes, setIncomes] = useState<any>(null);
  const [modal, setModal] = useState<'expense' | 'income' | null>(null);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const currency = authStore.school?.currency ?? 'XOF';

  const load = useCallback(() => {
    api('/finance/cashbook').then(setCashbook).catch((e) => setError(e.message));
    api('/finance/expenses?pageSize=25').then(setExpenses).catch(() => undefined);
    api('/finance/incomes?pageSize=25').then(setIncomes).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/finance/${modal === 'expense' ? 'expenses' : 'incomes'}`, {
        method: 'POST',
        body: JSON.stringify({ ...form, amount: parseInt(form.amount, 10) }),
      });
      setModal(null);
      setForm({});
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Comptabilité"
        actions={
          <>
            <button className="btn-secondary" onClick={() => { setForm({}); setModal('income'); }}><Plus size={16} /> Recette</button>
            <button className="btn-primary" onClick={() => { setForm({}); setModal('expense'); }}><Plus size={16} /> Dépense</button>
          </>
        }
      />

      {cashbook && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Paiements élèves</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatMoney(cashbook.payments, currency)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Autres recettes</p>
            <p className="mt-2 text-xl font-bold tabular-nums">{formatMoney(cashbook.otherIncomes, currency)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Dépenses</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-red-600 dark:text-red-400">{formatMoney(cashbook.expenses, currency)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Solde de caisse</p>
            <p className="mt-2 text-xl font-bold tabular-nums">{formatMoney(cashbook.balance, currency)}</p>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Dépenses" />
          {!expenses ? <Spinner /> : (
            <DataTable
              columns={[
                { key: 'label', header: 'Libellé', render: (e: any) => <span className="font-medium">{e.label}</span> },
                { key: 'category', header: 'Catégorie' },
                { key: 'date', header: 'Date', render: (e: any) => formatDate(e.date) },
                { key: 'amount', header: 'Montant', render: (e: any) => <span className="tabular-nums">{formatMoney(e.amount, currency)}</span> },
              ]}
              rows={expenses.items}
              emptyLabel="Aucune dépense"
            />
          )}
        </Card>
        <Card>
          <CardHeader title="Recettes (hors scolarité)" />
          {!incomes ? <Spinner /> : (
            <DataTable
              columns={[
                { key: 'label', header: 'Libellé', render: (i: any) => <span className="font-medium">{i.label}</span> },
                { key: 'category', header: 'Catégorie' },
                { key: 'date', header: 'Date', render: (i: any) => formatDate(i.date) },
                { key: 'amount', header: 'Montant', render: (i: any) => <span className="tabular-nums">{formatMoney(i.amount, currency)}</span> },
              ]}
              rows={incomes.items}
              emptyLabel="Aucune recette"
            />
          )}
        </Card>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'expense' ? 'Nouvelle dépense' : 'Nouvelle recette'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Libellé" required>
            <input required className="input" value={form.label ?? ''} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie">
              <input className="input" value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="SALAIRES, CHARGES…" />
            </Field>
            <Field label="Montant" required>
              <input type="number" min={0} required className="input" value={form.amount ?? ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Enregistrer</button>
        </form>
      </Modal>
    </div>
  );
}
