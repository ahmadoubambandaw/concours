'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar, Card, DataTable, Field, Modal, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { authStore } from '@/lib/api';

const EMPTY = { firstName: '', lastName: '', gender: 'M', contractType: 'CDI', specialty: '', email: '', phone: '', salary: '', subjectIds: [] as string[] };

export default function TeachersPage() {
  const [data, setData] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [error, setError] = useState('');
  const currency = authStore.school?.currency ?? 'XOF';

  const load = useCallback(() => {
    api(`/teachers?search=${encodeURIComponent(search)}&pageSize=50`).then(setData).catch((e) => setError(e.message));
  }, [search]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    api('/academics/subjects?pageSize=100').then((d) => setSubjects(d.items)).catch(() => undefined);
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setError('');
    setShowCreate(true);
  };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({
      firstName: t.firstName, lastName: t.lastName, gender: t.gender,
      contractType: t.contractType, specialty: t.specialty ?? '', email: t.email ?? '',
      phone: t.phone ?? '', salary: t.salary ? String(t.salary) : '',
      subjectIds: (t.subjects ?? []).map((s: any) => s.subject.id),
    });
    setError('');
    setShowCreate(true);
  };

  const toggleSubject = (id: string) =>
    setForm((f: any) => ({
      ...f,
      subjectIds: f.subjectIds.includes(id)
        ? f.subjectIds.filter((s: string) => s !== id)
        : [...f.subjectIds, id],
    }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { subjectIds, ...payload } = form;
      const body = JSON.stringify({ ...payload, salary: form.salary ? parseInt(form.salary, 10) : undefined });
      // Création ou mise à jour de l'enseignant.
      const teacher = editId
        ? await api(`/teachers/${editId}`, { method: 'PATCH', body })
        : await api('/teachers', { method: 'POST', body });
      // Puis on relie les matières sélectionnées.
      await api(`/teachers/${teacher.id}/subjects`, {
        method: 'PUT',
        body: JSON.stringify({ subjectIds }),
      });
      setShowCreate(false);
      setForm({ ...EMPTY });
      setEditId(null);
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
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouvel enseignant</button>}
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
              {
                key: 'subjects', header: 'Matières',
                render: (t: any) =>
                  t.subjects?.length
                    ? t.subjects.map((s: any) => s.subject.name).join(', ')
                    : <span style={{ color: 'var(--text-muted)' }}>À relier</span>,
              },
              { key: 'phone', header: 'Contact', render: (t: any) => t.phone ?? t.email ?? '—' },
              { key: 'contractType', header: 'Contrat' },
              { key: 'salary', header: 'Salaire', render: (t: any) => (t.salary ? <span className="tabular-nums">{formatMoney(t.salary, currency)}</span> : '—') },
              { key: 'status', header: 'Statut', render: (t: any) => <StatusBadge status={t.status} /> },
            ]}
            rows={data.items}
            onRowClick={openEdit}
            emptyLabel="Aucun enseignant"
          />
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={editId ? 'Modifier l\'enseignant' : 'Nouvel enseignant'} wide>
        <form onSubmit={create} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required><input required className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Nom" required><input required className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            <Field label="Sexe" required>
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="M">Homme</option><option value="F">Femme</option>
              </select>
            </Field>
            <Field label="Spécialité"><input className="input" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="ex. Sciences" /></Field>
            <Field label="Email"><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Téléphone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Contrat">
              <select className="input" value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })}>
                {['CDI', 'CDD', 'VACATAIRE', 'FONCTIONNAIRE', 'STAGIAIRE'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Salaire mensuel"><input type="number" className="input" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field>
          </div>

          {/* Matières réellement enseignées (remplit la colonne « Matières ») */}
          <Field label="Matières enseignées">
            {subjects.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Aucune matière définie. Créez d&apos;abord vos matières dans « Classes &amp; niveaux ».
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => {
                  const on = form.subjectIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSubject(s.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? 'border-brand-600 bg-brand-600/10 font-medium text-brand-600 dark:text-brand-400' : ''}`}
                      style={on ? undefined : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">{editId ? 'Enregistrer' : 'Créer'}</button>
        </form>
      </Modal>
    </div>
  );
}
