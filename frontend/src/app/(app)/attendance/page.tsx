'use client';

// Présences : appel d'une classe (saisie rapide), statistiques.

import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar, Card, CardHeader, EmptyState, PageHeader, Spinner } from '@/components/ui';

const STATUSES = [
  { value: 'PRESENT', label: 'Présent', cls: 'bg-emerald-600 text-white' },
  { value: 'ABSENT', label: 'Absent', cls: 'bg-red-600 text-white' },
  { value: 'LATE', label: 'Retard', cls: 'bg-amber-500 text-white' },
  { value: 'EXCUSED', label: 'Excusé', cls: 'bg-blue-600 text-white' },
];

export default function AttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sheet, setSheet] = useState<any[] | null>(null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/academics/classes?pageSize=100').then((d) => {
      setClasses(d.items);
      if (d.items[0]) setClassId(d.items[0].id);
    });
  }, []);

  const load = useCallback(() => {
    if (!classId) return;
    api(`/attendance/class/${classId}?date=${date}`).then((rows) => {
      setSheet(rows);
      setMarks(Object.fromEntries(rows.map((r: any) => [r.student.id, r.record?.status ?? 'PRESENT'])));
    });
    api(`/attendance/stats?classId=${classId}`).then(setStats).catch(() => undefined);
  }, [classId, date]);
  useEffect(load, [load]);

  const save = async () => {
    setMessage(''); setError('');
    try {
      const records = Object.entries(marks).map(([studentId, status]) => ({ studentId, status }));
      await api('/attendance/bulk', {
        method: 'POST',
        body: JSON.stringify({ classId, date, records }),
      });
      setMessage("Appel enregistré.");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const markAll = (status: string) =>
    setMarks(Object.fromEntries(Object.keys(marks).map((id) => [id, status])));

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Présences"
        subtitle={stats?.presenceRate != null ? `Taux de présence de la classe : ${stats.presenceRate}%` : undefined}
        actions={<button className="btn-primary" onClick={save} disabled={!sheet?.length}><Save size={16} /> Enregistrer l&apos;appel</button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input max-w-56" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className="input max-w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="ml-auto flex gap-2">
          <button className="btn-secondary !py-1.5 text-xs" onClick={() => markAll('PRESENT')}>Tous présents</button>
          <button className="btn-secondary !py-1.5 text-xs" onClick={() => markAll('ABSENT')}>Tous absents</button>
        </div>
      </div>

      {message && <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>}
      {error && <p className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <Card>
        <CardHeader title="Feuille d'appel" subtitle={sheet ? `${sheet.length} élèves` : undefined} />
        {!sheet ? (
          <Spinner />
        ) : sheet.length === 0 ? (
          <EmptyState title="Aucun élève inscrit dans cette classe" />
        ) : (
          <div className="p-3">
            {sheet.map((row: any) => (
              <div key={row.student.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <Avatar name={`${row.student.firstName} ${row.student.lastName}`} photoUrl={row.student.photoUrl} />
                  <div>
                    <p className="text-sm font-medium">{row.student.lastName} {row.student.firstName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.student.matricule}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setMarks({ ...marks, [row.student.id]: s.value })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        marks[row.student.id] === s.value ? s.cls : 'border hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                      style={marks[row.student.id] === s.value ? undefined : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
