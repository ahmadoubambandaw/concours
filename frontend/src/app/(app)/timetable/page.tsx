'use client';

// Emploi du temps hebdomadaire par classe, avec création de créneaux
// et détection de conflits (enseignant / salle / classe).

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, Field, Modal, PageHeader, Spinner } from '@/components/ui';
import { DAYS_FR } from '@/lib/format';

const SERIES = ['var(--viz-series-1)', 'var(--viz-series-2)', 'var(--viz-series-3)', 'var(--viz-series-5)', 'var(--viz-series-6)', 'var(--viz-series-4)'];

export default function TimetablePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [slots, setSlots] = useState<any[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({ dayOfWeek: '1', startTime: '08:00', endTime: '09:00' });
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api('/academics/classes?pageSize=100'),
      api('/academics/subjects?pageSize=100'),
      api('/teachers?pageSize=100'),
      api('/academics/classrooms?pageSize=100'),
    ]).then(([c, s, t, r]) => {
      setClasses(c.items); setSubjects(s.items); setTeachers(t.items); setRooms(r.items);
      if (c.items[0]) setClassId(c.items[0].id);
    });
  }, []);

  const load = useCallback(() => {
    if (!classId) return;
    api(`/timetable?classId=${classId}`).then(setSlots);
  }, [classId]);
  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setConflicts([]);
    try {
      await api('/timetable', {
        method: 'POST',
        body: JSON.stringify({
          classId,
          subjectId: form.subjectId,
          teacherId: form.teacherId,
          classroomId: form.classroomId || null,
          dayOfWeek: parseInt(form.dayOfWeek, 10),
          startTime: form.startTime,
          endTime: form.endTime,
        }),
      });
      setShowCreate(false);
      load();
    } catch (err: any) {
      setError(err.message);
      if (Array.isArray(err.details)) setConflicts(err.details);
    }
  };

  const remove = async (id: string) => {
    await api(`/timetable/${id}`, { method: 'DELETE' });
    load();
  };

  const subjectColor = (subjectId: string) => {
    const idx = subjects.findIndex((s) => s.id === subjectId);
    return SERIES[idx % SERIES.length];
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Emploi du temps"
        actions={<button className="btn-primary" onClick={() => setShowCreate(true)} disabled={!classId}><Plus size={16} /> Créneau</button>}
      />
      <div className="mb-4">
        <select className="input max-w-56" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!slots ? (
        <Spinner />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((day) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <Card key={day} className="p-3">
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {DAYS_FR[day]}
                </p>
                {daySlots.length === 0 && (
                  <p className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>—</p>
                )}
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="group relative mb-2 rounded-lg border-l-[3px] p-2.5 text-xs"
                    style={{ borderLeftColor: subjectColor(slot.subjectId), background: 'var(--surface-2)' }}
                  >
                    <p className="font-semibold tabular-nums">{slot.startTime} – {slot.endTime}</p>
                    <p className="mt-0.5 font-medium">{slot.subject.name}</p>
                    <p style={{ color: 'var(--text-muted)' }}>
                      {slot.teacher.firstName} {slot.teacher.lastName}
                      {slot.classroom ? ` · ${slot.classroom.name}` : ''}
                    </p>
                    <button
                      onClick={() => remove(slot.id)}
                      className="absolute right-1.5 top-1.5 hidden rounded p-1 text-red-500 hover:bg-red-50 group-hover:block dark:hover:bg-red-950"
                      aria-label="Supprimer le créneau"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau créneau">
        <form onSubmit={create} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Matière" required>
              <select required className="input" value={form.subjectId ?? ''} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">Choisir…</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Enseignant" required>
              <select required className="input" value={form.teacherId ?? ''} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                <option value="">Choisir…</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
              </select>
            </Field>
            <Field label="Jour" required>
              <select className="input" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
                {[1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{DAYS_FR[d]}</option>)}
              </select>
            </Field>
            <Field label="Salle">
              <select className="input" value={form.classroomId ?? ''} onChange={(e) => setForm({ ...form, classroomId: e.target.value })}>
                <option value="">Aucune</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Début" required>
              <input type="time" required className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </Field>
            <Field label="Fin" required>
              <input type="time" required className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </Field>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
              <p>{error}</p>
              {conflicts.map((c, i) => <p key={i} className="mt-1 text-xs">• {c.message}</p>)}
            </div>
          )}
          <button type="submit" className="btn-primary w-full">Ajouter le créneau</button>
        </form>
      </Modal>
    </div>
  );
}
