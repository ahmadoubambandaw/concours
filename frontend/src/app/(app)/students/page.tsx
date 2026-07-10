'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar, Card, DataTable, Field, Modal, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { formatDate } from '@/lib/format';

export default function StudentsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({ firstName: '', lastName: '', gender: 'M', birthDate: '', birthPlace: '' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api(`/students?search=${encodeURIComponent(search)}&page=${page}&pageSize=20`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const student = await api('/students', { method: 'POST', body: JSON.stringify(form) });
      setShowCreate(false);
      router.push(`/students/${student.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Élèves"
        subtitle={data ? `${data.total} élèves` : undefined}
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nouvel élève
          </button>
        }
      />
      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          className="input pl-9"
          placeholder="Nom, prénom ou matricule…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Card>
        {!data ? (
          <Spinner />
        ) : (
          <>
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Élève',
                  render: (s: any) => (
                    <div className="flex items-center gap-3">
                      <Avatar name={`${s.firstName} ${s.lastName}`} photoUrl={s.photoUrl} />
                      <div>
                        <p className="font-medium">{s.lastName} {s.firstName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.matricule}</p>
                      </div>
                    </div>
                  ),
                },
                { key: 'gender', header: 'Sexe', render: (s: any) => (s.gender === 'M' ? 'Garçon' : 'Fille') },
                { key: 'birthDate', header: 'Naissance', render: (s: any) => formatDate(s.birthDate) },
                {
                  key: 'class',
                  header: 'Classe',
                  render: (s: any) => s.enrollments?.[0]?.class?.name ?? <span style={{ color: 'var(--text-muted)' }}>Non inscrit</span>,
                },
                { key: 'status', header: 'Statut', render: (s: any) => <StatusBadge status={s.status} /> },
              ]}
              rows={data.items}
              onRowClick={(s: any) => router.push(`/students/${s.id}`)}
              emptyLabel="Aucun élève trouvé"
            />
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm" style={{ borderColor: 'var(--border)' }}>
                <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</button>
                <span style={{ color: 'var(--text-muted)' }}>Page {data.page} / {data.totalPages}</span>
                <button className="btn-secondary" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Suivant</button>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvel élève">
        <form onSubmit={create} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required>
              <input required className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </Field>
            <Field label="Nom" required>
              <input required className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </Field>
            <Field label="Sexe" required>
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="M">Garçon</option>
                <option value="F">Fille</option>
              </select>
            </Field>
            <Field label="Date de naissance" required>
              <input type="date" required className="input" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Lieu de naissance">
            <input className="input" value={form.birthPlace} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Le matricule et le QR code sont générés automatiquement.
          </p>
          <button type="submit" className="btn-primary w-full">Créer l&apos;élève</button>
        </form>
      </Modal>
    </div>
  );
}
