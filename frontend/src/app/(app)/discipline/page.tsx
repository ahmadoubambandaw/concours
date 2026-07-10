'use client';

// Discipline : sanctions, convocations et historique.

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Card, DataTable, Field, Modal, PageHeader, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';

const TYPES: Record<string, string> = {
  AVERTISSEMENT: 'Avertissement',
  BLAME: 'Blâme',
  RETENUE: 'Retenue',
  EXCLUSION_TEMPORAIRE: 'Exclusion temporaire',
  EXCLUSION_DEFINITIVE: 'Exclusion définitive',
  CONVOCATION_PARENTS: 'Convocation des parents',
};

export default function DisciplinePage() {
  const [data, setData] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ type: 'AVERTISSEMENT' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/welfare/discipline?pageSize=50').then(setData);
  }, []);
  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api('/welfare/discipline', { method: 'POST', body: JSON.stringify(form) });
      setShow(false); setForm({ type: 'AVERTISSEMENT' }); load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Discipline"
        actions={<button className="btn-primary" onClick={async () => {
          setShow(true);
          const s = await api('/students?pageSize=100');
          setStudents(s.items);
        }}><Plus size={16} /> Nouvel incident</button>}
      />
      <Card>
        {!data ? <Spinner /> : (
          <DataTable
            columns={[
              { key: 'student', header: 'Élève', render: (d: any) => <span className="font-medium">{d.student.lastName} {d.student.firstName}</span> },
              { key: 'type', header: 'Type', render: (d: any) => <Badge color="red">{TYPES[d.type] ?? d.type}</Badge> },
              { key: 'description', header: 'Description', render: (d: any) => <span className="line-clamp-1">{d.description}</span> },
              { key: 'sanction', header: 'Sanction', render: (d: any) => d.sanction ?? '—' },
              { key: 'date', header: 'Date', render: (d: any) => formatDate(d.date) },
            ]}
            rows={data.items}
            emptyLabel="Aucun incident disciplinaire"
          />
        )}
      </Card>

      <Modal open={show} onClose={() => setShow(false)} title="Nouvel incident disciplinaire">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Élève" required>
            <select required className="input" value={form.studentId ?? ''} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">Choisir…</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
            </select>
          </Field>
          <Field label="Type" required>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Description" required>
            <textarea required className="input" rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Sanction appliquée">
            <input className="input" value={form.sanction ?? ''} onChange={(e) => setForm({ ...form, sanction: e.target.value })} />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Enregistrer</button>
        </form>
      </Modal>
    </div>
  );
}
