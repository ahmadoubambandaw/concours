'use client';

// Graphiques du tableau de bord — construits selon la méthode data-viz :
// couleurs de la palette validée (via variables CSS), marques fines,
// grille discrète, tooltips au survol, légende dès 2 séries, un seul axe.

import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatMoney } from '@/lib/format';

const axisStyle = { fontSize: 11, fill: 'var(--text-muted)' };

const tooltipStyle = {
  contentStyle: {
    background: 'var(--surface-1)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    fontSize: 12,
    color: 'var(--text-primary)',
  },
  labelStyle: { color: 'var(--text-secondary)', fontWeight: 600 },
  cursor: { fill: 'color-mix(in srgb, var(--text-muted) 8%, transparent)' },
};

const compactMoney = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString('fr-FR')} M` : v >= 1000 ? `${Math.round(v / 1000)} k` : String(v);

export interface TrendPoint {
  label: string;
  payments: number;
  expenses: number;
  presenceRate: number | null;
  enrollments: number;
}

/** Encaissements vs dépenses par mois (2 séries, barres fines arrondies). */
export const FinanceTrendChart = ({ data, currency = 'XOF' }: { data: TrendPoint[]; currency?: string }) => (
  <ResponsiveContainer width="100%" height={260}>
    <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
      <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
      <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={compactMoney} width={44} />
      <Tooltip {...tooltipStyle} formatter={(value: any, name: any) => [formatMoney(Number(value), currency), name]} />
      <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
      <Bar dataKey="payments" name="Encaissements" fill="var(--viz-series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} />
      <Bar dataKey="expenses" name="Dépenses" fill="var(--viz-series-2)" radius={[4, 4, 0, 0]} maxBarSize={18} />
    </BarChart>
  </ResponsiveContainer>
);

/** Taux de présence mensuel (série unique — pas de légende, le titre la nomme). */
export const PresenceTrendChart = ({ data }: { data: TrendPoint[] }) => (
  <ResponsiveContainer width="100%" height={260}>
    <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
      <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
      <YAxis tick={axisStyle} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
      <Tooltip {...tooltipStyle} formatter={(value: any) => [`${value}%`, 'Taux de présence']} />
      <Line
        type="monotone"
        dataKey="presenceRate"
        name="Taux de présence"
        stroke="var(--viz-series-1)"
        strokeWidth={2}
        // Points visibles : sans eux, un mois isolé (données partielles)
        // ne rendrait aucune marque à l'écran.
        dot={{ r: 3, strokeWidth: 0, fill: 'var(--viz-series-1)' }}
        activeDot={{ r: 5 }}
        connectNulls
      />
    </LineChart>
  </ResponsiveContainer>
);

export interface YearComparisonRow {
  year: string;
  enrollments: number;
  successRate: number | null;
  collected: number;
}

/** Effectifs par année scolaire (série unique). */
export const YearComparisonChart = ({ data }: { data: YearComparisonRow[] }) => (
  <ResponsiveContainer width="100%" height={220}>
    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
      <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
      <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
      <Tooltip {...tooltipStyle} formatter={(value: any) => [value, 'Inscriptions']} />
      <Bar dataKey="enrollments" name="Inscriptions" fill="var(--viz-series-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
    </BarChart>
  </ResponsiveContainer>
);
