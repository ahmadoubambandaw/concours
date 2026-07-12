'use client';

// Infirmerie : consultations, vaccinations, traitements.

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Card, DataTable, Field, Modal, PageHeader, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';

export default function InfirmaryPage() {
  const [data, setData] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ type: 'CONSULTATION' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/welfare/infirmary/visits?pageSize=50').then(setData);
  }, []);
  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api('/welfare/infirmary/visits', { method: 'POST', body: JSON.stringify(form) });
      setShow(false); setForm({ type: 'CONSULTATION' }); load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Infirmerie"
        actions={<button className="btn-primary" onClick={async () => {
          setShow(true);
          const s = await api('/students?pageSize=100');
          setStudents(s.items);
        }}><Plus size={16} /> Nouvelle visite</button>}
      />
      <Card>
        {!data ? <Spinner /> : (
          <DataTable
            columns={[
              { key: 'student', header: 'Élève', render: (v: any) => <span className="font-medium">{v.student.lastName} {v.student.firstName}</span> },
              { key: 'type', header: 'Type', render: (v: any) => <Badge color="blue">{v.type}</Badge> },
              { key: 'diagnosis', header: 'Diagnostic', render: (v: any) => v.diagnosis ?? '—' },
              { key: 'treatment', header: 'Traitement', render: (v: any) => v.treatment ?? '—' },
              { key: 'allergies', header: 'Allergies connues', render: (v: any) => v.student.allergies ?? '—' },
              { key: 'date', header: 'Date', render: (v: any) => formatDate(v.date) },
            ]}
            rows={data.items}
            emptyLabel="Aucune visite médicale"
          />
        )}
      </Card>

      <Modal open={show} onClose={() => setShow(false)} title="Nouvelle visite médicale">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Élève" required>
            <select required className="input" value={form.studentId ?? ''} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">Choisir…</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
            </select>
          </Field>
          <Field label="Type" required>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="CONSULTATION">Consultation</option>
              <option value="VACCINATION">Vaccination</option>
              <option value="URGENCE">Urgence</option>
            </select>
          </Field>
          <Field label="Diagnostic"><input className="input" value={form.diagnosis ?? ''} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></Field>
          <Field label="Traitement"><input className="input" value={form.treatment ?? ''} onChange={(e) => setForm({ ...form, treatment: e.target.value })} /></Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Enregistrer</button>
        </form>
      </Modal>
    </div>
  );
}
