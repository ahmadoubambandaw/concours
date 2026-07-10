'use client';

// Rapports : exports CSV/Excel et comparaison entre années scolaires.

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api, apiDownload, authStore } from '@/lib/api';
import { Card, CardHeader, DataTable, PageHeader, Spinner } from '@/components/ui';
import { YearComparisonChart } from '@/components/charts';
import { formatMoney } from '@/lib/format';

const EXPORTS = [
  { path: '/reports/students.csv', file: 'eleves.csv', label: 'Liste des élèves', desc: 'Matricules, classes, contacts des tuteurs' },
  { path: '/reports/payments.csv', file: 'paiements.csv', label: 'Paiements', desc: 'Tous les encaissements avec reçus et modes' },
  { path: '/reports/results.csv', file: 'resultats.csv', label: 'Résultats scolaires', desc: 'Moyennes, rangs et mentions par période' },
];

export default function ReportsPage() {
  const [comparison, setComparison] = useState<any[] | null>(null);
  const currency = authStore.school?.currency ?? 'XOF';

  useEffect(() => {
    api('/dashboard/year-comparison').then(setComparison).catch(() => setComparison([]));
  }, []);

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Rapports & exports" subtitle="Exports compatibles Excel (CSV avec séparateur ;)" />

      <div className="grid gap-4 sm:grid-cols-3">
        {EXPORTS.map((e) => (
          <Card key={e.path} className="p-5">
            <h3 className="text-sm font-semibold">{e.label}</h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{e.desc}</p>
            <button className="btn-secondary mt-4 w-full" onClick={() => apiDownload(e.path, e.file)}>
              <Download size={15} /> Télécharger CSV
            </button>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="Comparaison entre années scolaires" subtitle="Effectifs, réussite et encaissements" />
        {!comparison ? <Spinner /> : (
          <>
            <div className="p-4">
              <YearComparisonChart data={comparison} />
            </div>
            <DataTable
              columns={[
                { key: 'year', header: 'Année', render: (r: any) => <span className="font-medium">{r.year}</span> },
                { key: 'enrollments', header: 'Inscriptions', render: (r: any) => <span className="tabular-nums">{r.enrollments}</span> },
                { key: 'averageOfAverages', header: 'Moyenne générale', render: (r: any) => (r.averageOfAverages != null ? `${r.averageOfAverages}/20` : '—') },
                { key: 'successRate', header: 'Taux de réussite', render: (r: any) => (r.successRate != null ? `${r.successRate}%` : '—') },
                { key: 'collected', header: 'Encaissé', render: (r: any) => <span className="tabular-nums">{formatMoney(r.collected, currency)}</span> },
              ]}
              rows={comparison.map((r: any) => ({ ...r, id: r.year }))}
              emptyLabel="Pas encore de données"
            />
          </>
        )}
      </Card>
    </div>
  );
}
