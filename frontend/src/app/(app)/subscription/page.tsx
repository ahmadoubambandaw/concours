'use client';

// Mon abonnement : formule actuelle, usage vs limites, souscription
// (PayDunya) et historique.

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { PricingGrid } from '@/components/PricingGrid';
import { Badge, Card, CardHeader, DataTable, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';

const PLAN_LABELS: Record<string, string> = { DECOUVERTE: 'Découverte', STANDARD: 'Standard', PREMIUM: 'Premium' };

export default function SubscriptionPage() {
  const [current, setCurrent] = useState<any>(null);
  const [error, setError] = useState('');
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const currency = authStore.school?.currency ?? 'XOF';

  const load = useCallback(() => {
    api('/subscription/current').then(setCurrent).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const subscribe = async (plan: string, cycle: 'MONTHLY' | 'ANNUAL') => {
    setBusyPlan(plan);
    setError('');
    try {
      const { checkoutUrl } = await api('/subscription/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan, cycle }),
      });
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err.message);
      setBusyPlan(null);
    }
  };

  if (error && !current) return <EmptyState title="Erreur" hint={error} />;
  if (!current) return <Spinner />;

  const usage = current.usage;
  const pct = usage.maxStudents ? Math.min(100, Math.round((usage.students / usage.maxStudents) * 100)) : null;

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Mon abonnement" subtitle="Gérez votre formule et vos limites" />

      {error && <p className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">{error}</p>}

      {/* Formule actuelle */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Formule actuelle</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-bold">{PLAN_LABELS[current.plan] ?? current.plan}</span>
            {current.isTrial && <Badge color="yellow">Essai</Badge>}
          </div>
          {current.planExpiresAt ? (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {current.isTrial ? 'Essai jusqu\'au ' : 'Renouvellement le '}{formatDate(current.planExpiresAt)}
            </p>
          ) : (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Sans expiration</p>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Élèves</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">{usage.students}</span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              / {usage.maxStudents ?? 'illimité'}
            </span>
          </div>
          {pct !== null && (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-600'}`} style={{ width: `${pct}%` }} />
              </div>
              {pct >= 90 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle size={13} /> Limite bientôt atteinte — pensez à passer à la formule supérieure.
                </p>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Grille pour changer de formule */}
      <Card className="p-6">
        <h2 className="mb-1 text-center text-xl font-bold">Changer de formule</h2>
        <p className="mb-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Le paiement se fait par Orange Money, Wave, Free Money ou carte (PayDunya).
        </p>
        <PricingGrid
          currency={currency}
          currentPlan={current.plan}
          onSubscribe={subscribe}
          busyPlan={busyPlan}
          ctaLabel="Souscrire"
        />
      </Card>

      {/* Historique */}
      {current.history?.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Historique des abonnements" />
          <DataTable
            columns={[
              { key: 'plan', header: 'Formule', render: (s: any) => PLAN_LABELS[s.plan] ?? s.plan },
              { key: 'cycle', header: 'Périodicité', render: (s: any) => (s.cycle === 'ANNUAL' ? 'Annuel' : 'Mensuel') },
              { key: 'amount', header: 'Montant', render: (s: any) => <span className="tabular-nums">{formatMoney(s.amount, currency)}</span> },
              { key: 'status', header: 'Statut', render: (s: any) => <Badge color={s.status === 'ACTIVE' ? 'green' : s.status === 'PENDING' ? 'yellow' : 'gray'}>{s.status}</Badge> },
              { key: 'expiresAt', header: 'Expire le', render: (s: any) => formatDate(s.expiresAt) },
            ]}
            rows={current.history}
          />
        </Card>
      )}
    </div>
  );
}
