'use client';

// Assistant IA : élèves à risque, résumé de classe, questions libres.

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Send, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Spinner } from '@/components/ui';

export default function AiPage() {
  const [atRisk, setAtRisk] = useState<any[] | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [summaryError, setSummaryError] = useState('');
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    api('/ai/at-risk?threshold=1').then(setAtRisk).catch(() => setAtRisk([]));
    Promise.all([api('/academics/classes?pageSize=100'), api('/academics/terms?pageSize=20')]).then(([c, t]) => {
      setClasses(c.items);
      setTerms(t.items);
      if (c.items[0]) setClassId(c.items[0].id);
      if (t.items[0]) setTermId(t.items[0].id);
    });
  }, []);

  const loadSummary = useCallback(() => {
    if (!classId || !termId) return;
    setSummary(null);
    setSummaryError('');
    api(`/ai/class-summary/${classId}/term/${termId}`)
      .then(setSummary)
      .catch((e) => setSummaryError(e.message));
  }, [classId, termId]);
  useEffect(loadSummary, [loadSummary]);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    const q = question;
    setQuestion('');
    try {
      const res = await api('/ai/ask', { method: 'POST', body: JSON.stringify({ question: q }) });
      setChat((c) => [...c, { q, a: res.answer }]);
    } catch (err: any) {
      setChat((c) => [...c, { q, a: `Erreur : ${err.message}` }]);
    } finally {
      setAsking(false);
    }
  };

  const riskColor = (level: string) =>
    level === 'CRITIQUE' ? 'red' : level === 'ÉLEVÉ' ? 'yellow' : 'blue';

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Assistant IA"
        subtitle="Analyses pédagogiques : détection des élèves en difficulté, résumés et recommandations"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Élèves à risque */}
        <Card>
          <CardHeader
            title="Élèves à risque d'échec"
            subtitle="Score combinant moyennes, absentéisme et discipline"
            action={<AlertTriangle size={16} className="text-amber-500" />}
          />
          <div className="max-h-[30rem] overflow-y-auto p-3">
            {!atRisk ? (
              <Spinner />
            ) : atRisk.length === 0 ? (
              <EmptyState title="Aucun élève à risque détecté" hint="Générez des bulletins et saisissez les présences pour affiner l'analyse." />
            ) : (
              atRisk.map((r: any) => (
                <div key={r.student.id} className="mb-3 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{r.student.lastName} {r.student.firstName}
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{r.class?.name}</span>
                    </p>
                    <Badge color={riskColor(r.riskLevel)}>Risque {r.riskLevel} · {r.riskScore}/100</Badge>
                  </div>
                  <ul className="mt-2 space-y-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {r.factors.map((f: any, i: number) => <li key={i}>• {f.label}</li>)}
                  </ul>
                  <p className="mt-2 text-xs font-medium text-brand-600">Actions proposées :</p>
                  <ul className="mt-0.5 space-y-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {r.suggestions.slice(0, 2).map((s: string, i: number) => <li key={i}>→ {s}</li>)}
                  </ul>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {/* Résumé de classe */}
          <Card>
            <CardHeader title="Résumé automatique d'une classe" action={<Sparkles size={16} className="text-brand-600" />} />
            <div className="p-4">
              <div className="mb-3 flex gap-2">
                <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="input" value={termId} onChange={(e) => setTermId(e.target.value)}>
                  {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {summaryError ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{summaryError}</p>
              ) : !summary ? (
                <Spinner />
              ) : (
                <>
                  <p className="text-sm leading-relaxed">{summary.summary}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-lg font-bold tabular-nums">{summary.classAverage}/20</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Moyenne classe</p></div>
                    <div><p className="text-lg font-bold tabular-nums">{summary.successRate}%</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Réussite</p></div>
                    <div><p className="text-lg font-bold tabular-nums">{summary.strugglingCount}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>En difficulté</p></div>
                  </div>
                  <p className="mt-4 text-xs font-medium text-brand-600">Recommandations :</p>
                  <ul className="mt-1 space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {summary.recommendations.map((r: string, i: number) => <li key={i}>→ {r}</li>)}
                  </ul>
                </>
              )}
            </div>
          </Card>

          {/* Chat */}
          <Card>
            <CardHeader title="Posez une question" subtitle="Effectifs, impayés, présences du jour…" />
            <div className="p-4">
              <div className="mb-3 max-h-56 space-y-3 overflow-y-auto">
                {chat.map((m, i) => (
                  <div key={i}>
                    <p className="text-xs font-medium text-brand-600">Vous : {m.q}</p>
                    <p className="mt-1 rounded-lg p-2.5 text-sm" style={{ background: 'var(--surface-2)' }}>{m.a}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={ask} className="flex gap-2">
                <input
                  className="input"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Combien d'élèves sont absents aujourd'hui ?"
                />
                <button type="submit" className="btn-primary !px-3" disabled={asking} aria-label="Envoyer">
                  <Send size={16} />
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
