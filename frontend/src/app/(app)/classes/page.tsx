'use client';

// Classes, niveaux et matières de l'année active.

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Card, CardHeader, DataTable, Field, Modal, PageHeader, Spinner } from '@/components/ui';

const CYCLES: Record<string, string> = { MATERNELLE: 'Maternelle', PRIMAIRE: 'Primaire', COLLEGE: 'Collège', LYCEE: 'Lycée' };

export default function ClassesPage() {
  const [classes, setClasses] = useState<any>(null);
  const [levels, setLevels] = useState<any>(null);
  const [subjects, setSubjects] = useState<any>(null);
  const [years, setYears] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [modal, setModal] = useState<'class' | 'level' | 'subject' | null>(null);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([
      api('/academics/classes?pageSize=100'),
      api('/academics/levels?pageSize=100'),
      api('/academics/subjects?pageSize=100'),
      api('/academics/academic-years?pageSize=20'),
      api('/teachers?pageSize=100'),
    ]).then(([c, l, s, y, t]) => {
      setClasses(c); setLevels(l); setSubjects(s); setYears(y.items); setTeachers(t.items);
    }).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (modal === 'class') {
        await api('/academics/classes', { method: 'POST', body: JSON.stringify({ ...form, capacity: form.capacity ? parseInt(form.capacity, 10) : 50 }) });
      } else if (modal === 'level') {
        await api('/academics/levels', { method: 'POST', body: JSON.stringify({ ...form, order: form.order ? parseInt(form.order, 10) : 0 }) });
      } else if (modal === 'subject') {
        await api('/academics/subjects', { method: 'POST', body: JSON.stringify({ ...form, coefficient: form.coefficient ? parseFloat(form.coefficient) : 1 }) });
      }
      setModal(null);
      setForm({});
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!classes || !levels || !subjects) return <Spinner />;

  const activeYear = years.find((y) => y.status === 'ACTIVE');

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Classes & niveaux"
        subtitle={activeYear ? `Année scolaire ${activeYear.name}` : undefined}
        actions={
          <>
            <button className="btn-secondary" onClick={() => { setForm({ cycle: 'PRIMAIRE' }); setModal('level'); }}><Plus size={16} /> Niveau</button>
            <button className="btn-secondary" onClick={() => { setForm({}); setModal('subject'); }}><Plus size={16} /> Matière</button>
            <button className="btn-primary" onClick={() => { setForm({ academicYearId: activeYear?.id }); setModal('class'); }}><Plus size={16} /> Classe</button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Classes" subtitle={`${classes.total} classes`} />
          <DataTable
            columns={[
              { key: 'name', header: 'Classe', render: (c: any) => <span className="font-medium">{c.name}</span> },
              { key: 'level', header: 'Niveau', render: (c: any) => <Badge color="blue">{c.level?.name}</Badge> },
              { key: 'effectif', header: 'Effectif', render: (c: any) => <span className="tabular-nums">{c._count?.enrollments ?? 0} / {c.capacity}</span> },
              { key: 'room', header: 'Salle', render: (c: any) => c.classroom?.name ?? '—' },
              { key: 'mainTeacher', header: 'Prof. principal', render: (c: any) => (c.mainTeacher ? `${c.mainTeacher.firstName} ${c.mainTeacher.lastName}` : '—') },
            ]}
            rows={classes.items}
            emptyLabel="Aucune classe — créez vos niveaux puis vos classes"
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Niveaux" />
            <div className="p-3">
              {levels.items.length === 0 && <p className="px-2 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun niveau.</p>}
              {['MATERNELLE', 'PRIMAIRE', 'COLLEGE', 'LYCEE'].map((cycle) => {
                const items = levels.items.filter((l: any) => l.cycle === cycle);
                if (items.length === 0) return null;
                return (
                  <div key={cycle} className="mb-2">
                    <p className="px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{CYCLES[cycle]}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5 px-2">
                      {items.map((l: any) => <Badge key={l.id} color="gray">{l.name}</Badge>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <CardHeader title="Matières" subtitle="avec coefficients" />
            <div className="p-3">
              {subjects.items.length === 0 && <p className="px-2 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune matière.</p>}
              {subjects.items.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-black/[0.025] dark:hover:bg-white/[0.04]">
                  <span>{s.name}</span>
                  <Badge color="violet">coef. {s.coefficient}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Modales */}
      <Modal open={modal === 'class'} onClose={() => setModal(null)} title="Nouvelle classe">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nom" required><input required className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="6e A" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Niveau" required>
              <select required className="input" value={form.levelId ?? ''} onChange={(e) => setForm({ ...form, levelId: e.target.value })}>
                <option value="">Choisir…</option>
                {levels.items.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="Capacité"><input type="number" className="input" value={form.capacity ?? ''} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="50" /></Field>
          </div>
          <Field label="Professeur principal">
            <select className="input" value={form.mainTeacherId ?? ''} onChange={(e) => setForm({ ...form, mainTeacherId: e.target.value || null })}>
              <option value="">Aucun</option>
              {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
            </select>
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>

      <Modal open={modal === 'level'} onClose={() => setModal(null)} title="Nouveau niveau">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nom" required><input required className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="CM2, 6e, Terminale…" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cycle" required>
              <select className="input" value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })}>
                {Object.entries(CYCLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Ordre"><input type="number" className="input" value={form.order ?? ''} onChange={(e) => setForm({ ...form, order: e.target.value })} /></Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>

      <Modal open={modal === 'subject'} onClose={() => setModal(null)} title="Nouvelle matière">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nom" required><input required className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mathématiques" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code"><input className="input" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MATH" /></Field>
            <Field label="Coefficient" required><input type="number" step="0.5" required className="input" value={form.coefficient ?? ''} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} placeholder="4" /></Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>
    </div>
  );
}
