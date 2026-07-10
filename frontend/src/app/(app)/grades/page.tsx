'use client';

// Notes & bulletins : sélection classe + période, saisie des notes par
// évaluation, aperçu des résultats, génération et publication des bulletins.

import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Plus, Save } from 'lucide-react';
import { api, apiDownload } from '@/lib/api';
import { Badge, Card, CardHeader, DataTable, EmptyState, Field, Modal, PageHeader, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';

export default function GradesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [assessments, setAssessments] = useState<any[] | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [entry, setEntry] = useState<any>(null); // { assessment, rows }
  const [scores, setScores] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({ type: 'DEVOIR', maxScore: '20', coefficient: '1' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api('/academics/classes?pageSize=100'),
      api('/academics/terms?pageSize=20'),
      api('/academics/subjects?pageSize=100'),
    ]).then(([c, t, s]) => {
      setClasses(c.items);
      setTerms(t.items);
      setSubjects(s.items);
      if (c.items[0]) setClassId(c.items[0].id);
      if (t.items[0]) setTermId(t.items[0].id);
    });
  }, []);

  const load = useCallback(() => {
    if (!classId || !termId) return;
    setEntry(null);
    api(`/grades/assessments?classId=${classId}&termId=${termId}&pageSize=100`).then((d) => setAssessments(d.items));
    api(`/grades/results/class/${classId}/term/${termId}`).then(setResults).catch(() => setResults([]));
  }, [classId, termId]);
  useEffect(load, [load]);

  const openEntry = async (assessment: any) => {
    const data = await api(`/grades/assessments/${assessment.id}/grades`);
    setEntry(data);
    setScores(Object.fromEntries(data.rows.map((r: any) => [r.student.id, r.grade?.score ?? ''])));
  };

  const saveGrades = async () => {
    setError(''); setMessage('');
    try {
      const grades = Object.entries(scores)
        .filter(([, v]) => v !== '')
        .map(([studentId, score]) => ({ studentId, score: parseFloat(String(score)) }));
      await api('/grades/grades/bulk', {
        method: 'POST',
        body: JSON.stringify({ assessmentId: entry.assessment.id, grades }),
      });
      setMessage(`${grades.length} notes enregistrées.`);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const createAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api('/grades/assessments', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          classId,
          termId,
          maxScore: parseFloat(form.maxScore),
          coefficient: parseFloat(form.coefficient),
        }),
      });
      setShowCreate(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const generateCards = async () => {
    setError(''); setMessage('');
    try {
      const res = await api('/grades/report-cards/generate', {
        method: 'POST',
        body: JSON.stringify({ classId, termId }),
      });
      setMessage(`${res.count} bulletins générés.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const publishCards = async () => {
    setError(''); setMessage('');
    try {
      const res = await api('/grades/report-cards/publish', {
        method: 'POST',
        body: JSON.stringify({ classId, termId }),
      });
      setMessage(`${res.count} bulletins publiés (visibles par les parents et élèves).`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Notes & bulletins"
        actions={
          <>
            <button className="btn-secondary" onClick={generateCards} disabled={!classId || !termId}>
              <FileText size={16} /> Générer les bulletins
            </button>
            <button className="btn-secondary" onClick={publishCards} disabled={!classId || !termId}>
              Publier
            </button>
            <button className="btn-primary" onClick={() => setShowCreate(true)} disabled={!classId || !termId}>
              <Plus size={16} /> Évaluation
            </button>
          </>
        }
      />

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="input max-w-56" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input max-w-56" value={termId} onChange={(e) => setTermId(e.target.value)}>
          {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {message && <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{message}</p>}
      {error && <p className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Évaluations */}
        <Card>
          <CardHeader title="Évaluations" subtitle="Cliquez pour saisir les notes" />
          {!assessments ? (
            <Spinner />
          ) : (
            <DataTable
              columns={[
                { key: 'title', header: 'Titre', render: (a: any) => <span className="font-medium">{a.title}</span> },
                { key: 'subject', header: 'Matière', render: (a: any) => a.subject.name },
                { key: 'type', header: 'Type', render: (a: any) => <Badge color="blue">{a.type}</Badge> },
                { key: 'date', header: 'Date', render: (a: any) => formatDate(a.date) },
                { key: 'grades', header: 'Notes', render: (a: any) => <span className="tabular-nums">{a._count.grades}</span> },
              ]}
              rows={assessments}
              onRowClick={openEntry}
              emptyLabel="Aucune évaluation pour cette classe et cette période"
            />
          )}
        </Card>

        {/* Saisie ou classement */}
        {entry ? (
          <Card>
            <CardHeader
              title={`Saisie — ${entry.assessment.title}`}
              subtitle={`Barème /${entry.assessment.maxScore} · coef. ${entry.assessment.coefficient}`}
              action={<button className="btn-primary !px-3 !py-1.5" onClick={saveGrades}><Save size={14} /> Enregistrer</button>}
            />
            <div className="max-h-[32rem] overflow-y-auto p-3">
              {entry.rows.map((row: any) => (
                <div key={row.student.id} className="mb-1.5 flex items-center justify-between gap-3 rounded-lg px-2 py-1">
                  <span className="text-sm">{row.student.lastName} {row.student.firstName}</span>
                  <input
                    type="number"
                    min={0}
                    max={entry.assessment.maxScore}
                    step="0.5"
                    className="input !w-24 text-center tabular-nums"
                    value={scores[row.student.id] ?? ''}
                    onChange={(e) => setScores({ ...scores, [row.student.id]: e.target.value })}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Classement de la classe" subtitle="Moyennes pondérées calculées en direct" />
            {!results ? (
              <Spinner />
            ) : results.length === 0 ? (
              <EmptyState title="Pas encore de notes" hint="Créez une évaluation puis saisissez les notes." />
            ) : (
              <DataTable
                columns={[
                  { key: 'rank', header: 'Rang', render: (r: any) => <span className="font-semibold tabular-nums">{r.rank}</span> },
                  { key: 'student', header: 'Élève', render: (r: any) => `${r.student.lastName} ${r.student.firstName}` },
                  { key: 'average', header: 'Moyenne', render: (r: any) => <span className="font-medium tabular-nums">{r.average.toFixed(2)}/20</span> },
                  { key: 'mention', header: 'Mention', render: (r: any) => <Badge color={r.average >= 10 ? 'green' : 'red'}>{r.mention}</Badge> },
                ]}
                rows={results.map((r: any) => ({ ...r, id: r.student.id }))}
              />
            )}
          </Card>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle évaluation">
        <form onSubmit={createAssessment} className="space-y-4">
          <Field label="Titre" required>
            <input required className="input" value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Devoir n°1 — Mathématiques" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Matière" required>
              <select required className="input" value={form.subjectId ?? ''} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">Choisir…</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Type" required>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {['DEVOIR', 'CONTROLE', 'EXAMEN', 'TP', 'ORAL'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Barème" required>
              <input type="number" required className="input" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
            </Field>
            <Field label="Coefficient" required>
              <input type="number" step="0.25" required className="input" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} />
            </Field>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>
    </div>
  );
}
