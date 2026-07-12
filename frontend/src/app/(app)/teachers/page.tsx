'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar, Card, DataTable, Field, Modal, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { authStore } from '@/lib/api';

export default function TeachersPage() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({ firstName: '', lastName: '', gender: 'M', contractType: 'CDI', specialty: '', email: '', phone: '', salary: '' });
  const [error, setError] = useState('');
  const currency = authStore.school?.currency ?? 'XOF';

  const load = useCallback(() => {
    api(`/teachers?search=${encodeURIComponent(search)}&pageSize=50`).then(setData).catch((e) => setError(e.message));
  }, [search]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/teachers', {
        method: 'POST',
        body: JSON.stringify({ ...form, salary: form.salary ? parseInt(form.salary, 10) : undefined }),
      });
      setShowCreate(false);
      setForm({ firstName: '', lastName: '', gender: 'M', contractType: 'CDI', specialty: '', email: '', phone: '', salary: '' });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Enseignants"
        subtitle={data ? `${data.total} enseignants` : undefined}
        actions={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Nouvel enseignant</button>}
      />
      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input className="input pl-9" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        {!data ? (
          <Spinner />
        ) : (
          <DataTable
            columns={[
              {
                key: 'name', header: 'Enseignant',
                render: (t: any) => (
                  <div className="flex items-center gap-3">
                    <Avatar name={`${t.firstName} ${t.lastName}`} photoUrl={t.photoUrl} />
                    <div>
                      <p className="font-medium">{t.lastName} {t.firstName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.specialty ?? '—'}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'subjects', header: 'Matières', render: (t: any) => t.subjects?.map((s: any) => s.subject.name).join(', ') || '—' },
              { key: 'phone', header: 'Contact', render: (t: any) => t.phone ?? t.email ?? '—' },
              { key: 'contractType', header: 'Contrat' },
              { key: 'salary', header: 'Salaire', render: (t: any) => (t.salary ? <span className="tabular-nums">{formatMoney(t.salary, currency)}</span> : '—') },
              { key: 'status', header: 'Statut', render: (t: any) => <StatusBadge status={t.status} /> },
            ]}
            rows={data.items}
            emptyLabel="Aucun enseignant"
          />
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvel enseignant">
        <form onSubmit={create} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required><input required className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Nom" required><input required className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            <Field label="Sexe" required>
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="M">Homme</option><option value="F">Femme</option>
              </select>
            </Field>
            <Field label="Spécialité"><input className="input" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Mathématiques" /></Field>
            <Field label="Email"><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Téléphone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Contrat">
              <select className="input" value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })}>
                {['CDI', 'CDD', 'VACATAIRE', 'FONCTIONNAIRE', 'STAGIAIRE'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Salaire mensuel"><input type="number" className="input" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>
    </div>
  );
}
