'use client';

// Retour après paiement d'un abonnement PayDunya : confirme l'activation
// de la formule (le webhook l'a normalement déjà activée).

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, GraduationCap, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

type State = 'loading' | 'active' | 'pending' | 'cancelled' | 'error';
const PLAN_LABELS: Record<string, string> = { DECOUVERTE: 'Découverte', STANDARD: 'Standard', PREMIUM: 'Premium' };

function Return() {
  const params = useSearchParams();
  const token = params.get('token');
  const cancelled = params.get('annule') === '1';
  const [state, setState] = useState<State>('loading');
  const [sub, setSub] = useState<any>(null);

  useEffect(() => {
    if (cancelled) { setState('cancelled'); return; }
    if (!token) { setState('error'); return; }
    let tries = 0;
    let timer: any;
    const poll = async () => {
      tries += 1;
      try {
        const res = await api(`/subscription/status/${token}`);
        if (res.status === 'active') { setSub(res.subscription); setState('active'); return; }
      } catch { /* retry */ }
      if (tries < 6) timer = setTimeout(poll, 2500);
      else setState('pending');
    };
    poll();
    return () => clearTimeout(timer);
  }, [token, cancelled]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold">
          <GraduationCap className="text-brand-600" size={28} /> Scolaris
        </Link>
        <div className="card p-8 text-center">
          {state === 'loading' && (
            <>
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <h1 className="text-lg font-semibold">Activation de votre formule…</h1>
            </>
          )}
          {state === 'active' && (
            <>
              <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
              <h1 className="mt-4 text-lg font-semibold">Abonnement activé 🎉</h1>
              {sub && <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Formule {PLAN_LABELS[sub.plan] ?? sub.plan} — {sub.cycle === 'ANNUAL' ? 'annuel' : 'mensuel'}.</p>}
            </>
          )}
          {state === 'pending' && (
            <>
              <Clock className="mx-auto text-amber-500" size={48} />
              <h1 className="mt-4 text-lg font-semibold">Paiement en cours de confirmation</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Votre formule sera activée d&apos;ici quelques minutes.</p>
            </>
          )}
          {state === 'cancelled' && (
            <>
              <XCircle className="mx-auto text-red-500" size={48} />
              <h1 className="mt-4 text-lg font-semibold">Paiement annulé</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Aucun montant n&apos;a été débité.</p>
            </>
          )}
          {state === 'error' && (
            <>
              <XCircle className="mx-auto text-red-500" size={48} />
              <h1 className="mt-4 text-lg font-semibold">Lien invalide</h1>
            </>
          )}
          <Link href="/subscription" className="btn-primary mt-6 w-full">Voir mon abonnement</Link>
        </div>
      </div>
    </main>
  );
}

export default function SubscriptionReturnPage() {
  return <Suspense fallback={null}><Return /></Suspense>;
}
