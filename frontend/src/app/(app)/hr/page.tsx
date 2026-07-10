'use client';

// RH : personnel administratif, congés (approbation), paie mensuelle.

import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { Card, CardHeader, DataTable, Field, Modal, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';

export default function HrPage() {
  const [staff, setStaff] = useState<any>(null);
  const [leaves, setLeaves] = useState<any>(null);
  const [payroll, setPayroll] = useState<any>(null);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [showStaff, setShowStaff] = useState(false);
  const [form, setForm] = useState<any>({ contractType: 'CDI' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const currency = authStore.school?.currency ?? 'XOF';

  const load = useCallback(() => {
    api('/hr/staff?pageSize=50').then(setStaff).catch((e) => setError(e.message));
    api('/hr/leaves?pageSize=25').then(setLeaves).catch(() => undefined);
    api(`/hr/payroll?period=${period}`).then(setPayroll).catch(() => undefined);
  }, [period]);
  useEffect(load, [load]);

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/hr/staff', {
        method: 'POST',
        body: JSON.stringify({ ...form, salary: form.salary ? parseInt(form.salary, 10) : undefined }),
      });
      setShowStaff(false);
      setForm({ contractType: 'CDI' });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const generatePayroll = async () => {
    setMessage('');
    const res = await api('/hr/payroll/generate', { method: 'POST', body: JSON.stringify({ period }) });
    setMessage(`Paie générée : ${res.created} bulletins créés, ${res.skipped} déjà existants.`);
    load();
  };

  const decideLeave = async (id: string, action: 'approve' | 'reject') => {
    await api(`/hr/leaves/${id}/${action}`, { method: 'POST' });
    load();
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Ressources humaines"
        actions={<button className="btn-primary" onClick={() => setShowStaff(true)}><Plus size={16} /> Personnel</button>}
      />

      {message && <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Personnel administratif" subtitle={staff ? `${staff.total} personnes` : undefined} />
          {!staff ? <Spinner /> : (
            <DataTable
              columns={[
                { key: 'name', header: 'Nom', render: (s: any) => <span className="font-medium">{s.lastName} {s.firstName}</span> },
                { key: 'position', header: 'Poste' },
                { key: 'contractType', header: 'Contrat' },
                { key: 'salary', header: 'Salaire', render: (s: any) => (s.salary ? <span className="tabular-nums">{formatMoney(s.salary, currency)}</span> : '—') },
              ]}
              rows={staff.items}
              emptyLabel="Aucun personnel"
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Demandes de congés" />
          {!leaves ? <Spinner /> : (
            <DataTable
              columns={[
                {
                  key: 'who', header: 'Demandeur',
                  render: (l: any) => {
                    const p = l.teacher ?? l.staff;
                    return p ? `${p.lastName} ${p.firstName}` : '—';
                  },
                },
                { key: 'type', header: 'Type' },
                { key: 'dates', header: 'Période', render: (l: any) => `${formatDate(l.startDate)} → ${formatDate(l.endDate)}` },
                { key: 'status', header: 'Statut', render: (l: any) => <StatusBadge status={l.status} /> },
                {
                  key: 'actions', header: '',
                  render: (l: any) =>
                    l.status === 'PENDING' ? (
                      <div className="flex gap-1.5">
                        <button className="btn-secondary !p-1.5" onClick={() => decideLeave(l.id, 'approve')}><Check size={14} className="text-emerald-600" /></button>
                        <button className="btn-secondary !p-1.5" onClick={() => decideLeave(l.id, 'reject')}><X size={14} className="text-red-500" /></button>
                      </div>
                    ) : null,
                },
              ]}
              rows={leaves.items}
              emptyLabel="Aucune demande"
            />
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Paie"
          subtitle={payroll ? `Total net : ${formatMoney(payroll.totalNet, currency)}` : undefined}
          action={
            <div className="flex items-center gap-2">
              <input type="month" className="input !w-40" value={period} onChange={(e) => setPeriod(e.target.value)} />
              <button className="btn-primary !py-1.5" onClick={generatePayroll}>Générer la paie</button>
            </div>
          }
        />
        {!payroll ? <Spinner /> : (
          <DataTable
            columns={[
              {
                key: 'who', header: 'Employé',
                render: (p: any) => {
                  const person = p.teacher ?? p.staff;
                  return person ? `${person.lastName} ${person.firstName}` : '—';
                },
              },
              { key: 'period', header: 'Période' },
              { key: 'gross', header: 'Brut', render: (p: any) => <span className="tabular-nums">{formatMoney(p.gross, currency)}</span> },
              { key: 'net', header: 'Net', render: (p: any) => <span className="font-medium tabular-nums">{formatMoney(p.net, currency)}</span> },
              { key: 'status', header: 'Statut', render: (p: any) => <StatusBadge status={p.status} /> },
            ]}
            rows={payroll.entries}
            emptyLabel="Aucune paie pour cette période — cliquez sur « Générer la paie »"
          />
        )}
      </Card>

      <Modal open={showStaff} onClose={() => setShowStaff(false)} title="Nouveau membre du personnel">
        <form onSubmit={createStaff} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required><input required className="input" value={form.firstName ?? ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Nom" required><input required className="input" value={form.lastName ?? ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            <Field label="Poste" required><input required className="input" value={form.position ?? ''} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Secrétaire, gardien…" /></Field>
            <Field label="Salaire"><input type="number" className="input" value={form.salary ?? ''} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>
    </div>
  );
}
