'use client';

// Grille tarifaire réutilisable (landing + page abonnement).
// Récupère les formules depuis l'API publique et gère la bascule
// mensuel / annuel (2 mois offerts).

import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { formatMoney } from '@/lib/format';

export interface PlanDef {
  key: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  maxStudents: number | null;
  highlights: string[];
}

export const PricingGrid = ({
  currency = 'XOF',
  currentPlan,
  onSubscribe,
  busyPlan,
  ctaLabel = 'Choisir',
}: {
  currency?: string;
  currentPlan?: string;
  onSubscribe?: (plan: string, cycle: 'MONTHLY' | 'ANNUAL') => void;
  busyPlan?: string | null;
  ctaLabel?: string;
}) => {
  const [plans, setPlans] = useState<PlanDef[]>([]);
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  useEffect(() => {
    fetch('/api/backend/subscription/plans')
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => undefined);
  }, []);

  return (
    <div>
      {/* Bascule mensuel / annuel */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <button
          onClick={() => setCycle('MONTHLY')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${cycle === 'MONTHLY' ? 'bg-brand-600 text-white' : ''}`}
          style={cycle === 'MONTHLY' ? undefined : { color: 'var(--text-secondary)' }}
        >
          Mensuel
        </button>
        <button
          onClick={() => setCycle('ANNUAL')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${cycle === 'ANNUAL' ? 'bg-brand-600 text-white' : ''}`}
          style={cycle === 'ANNUAL' ? undefined : { color: 'var(--text-secondary)' }}
        >
          Annuel <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">2 mois offerts</span>
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((p) => {
          const price = cycle === 'ANNUAL' ? p.priceAnnual : p.priceMonthly;
          const isCurrent = currentPlan === p.key;
          const featured = p.key === 'STANDARD';
          return (
            <div
              key={p.key}
              className={`card relative flex flex-col p-6 ${featured ? 'ring-2 ring-brand-500' : ''}`}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-medium text-white">
                  Le plus choisi
                </span>
              )}
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{p.name}</h3>
                {p.key === 'PREMIUM' && <Sparkles size={16} className="text-brand-600" />}
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{p.tagline}</p>
              <div className="mt-4">
                {price === 0 ? (
                  <span className="text-3xl font-extrabold">Gratuit</span>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold tabular-nums">{formatMoney(price, currency)}</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}> /{cycle === 'ANNUAL' ? 'an' : 'mois'}</span>
                  </>
                )}
              </div>

              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                    <span style={{ color: 'var(--text-secondary)' }}>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <div className="rounded-lg border py-2 text-center text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    Formule actuelle
                  </div>
                ) : onSubscribe ? (
                  <button
                    className={`w-full ${featured || p.key === 'PREMIUM' ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={busyPlan === p.key || price === 0}
                    onClick={() => onSubscribe(p.key, cycle)}
                  >
                    {busyPlan === p.key ? 'Redirection…' : price === 0 ? 'Formule gratuite' : ctaLabel}
                  </button>
                ) : (
                  <a href="/register" className={`block w-full text-center ${featured || p.key === 'PREMIUM' ? 'btn-primary' : 'btn-secondary'}`}>
                    {price === 0 ? 'Commencer gratuitement' : 'Essayer 30 jours'}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
