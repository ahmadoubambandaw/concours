'use client';

// Page de retour après un paiement PayDunya : confirme le statut du
// paiement (le webhook IPN a normalement déjà enregistré la transaction ;
// on interroge /status pour l'afficher, avec quelques tentatives).

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, GraduationCap, XCircle } from 'lucide-react';
import { api, authStore } from '@/lib/api';
import { formatMoney } from '@/lib/format';

type State = 'loading' | 'completed' | 'pending' | 'cancelled' | 'error';

function PaymentReturn() {
  const params = useSearchParams();
  const token = params.get('token');
  const cancelled = params.get('annule') === '1';
  const [state, setState] = useState<State>('loading');
  const [payment, setPayment] = useState<any>(null);
  const currency = authStore.school?.currency ?? 'XOF';

  useEffect(() => {
    if (cancelled) {
      setState('cancelled');
      return;
    }
    if (!token) {
      setState('error');
      return;
    }
    let tries = 0;
    let timer: any;
    const poll = async () => {
      tries += 1;
      try {
        const res = await api(`/finance/online/status/${token}`);
        if (res.status === 'completed') {
          setPayment(res.payment);
          setState('completed');
          return;
        }
        if (res.status === 'cancelled') {
          setState('cancelled');
          return;
        }
      } catch {
        // on retente
      }
      if (tries < 6) {
        timer = setTimeout(poll, 2500);
      } else {
        setState('pending');
      }
    };
    poll();
    return () => clearTimeout(timer);
  }, [token, cancelled]);

  const back = typeof window !== 'undefined' ? sessionStorage.getItem('scolaris.payReturn') : null;

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
              <h1 className="text-lg font-semibold">Vérification du paiement…</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Merci de patienter quelques secondes.
              </p>
            </>
          )}
          {state === 'completed' && (
            <>
              <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
              <h1 className="mt-4 text-lg font-semibold">Paiement réussi 🎉</h1>
              {payment && (
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Reçu {payment.receiptNumber} · {formatMoney(payment.amount, currency)}
                </p>
              )}
            </>
          )}
          {state === 'pending' && (
            <>
              <Clock className="mx-auto text-amber-500" size={48} />
              <h1 className="mt-4 text-lg font-semibold">Paiement en cours de traitement</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Votre paiement est en cours de confirmation. Il apparaîtra dans vos paiements d&apos;ici quelques minutes.
              </p>
            </>
          )}
          {state === 'cancelled' && (
            <>
              <XCircle className="mx-auto text-red-500" size={48} />
              <h1 className="mt-4 text-lg font-semibold">Paiement annulé</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Aucun montant n&apos;a été débité. Vous pouvez réessayer à tout moment.
              </p>
            </>
          )}
          {state === 'error' && (
            <>
              <XCircle className="mx-auto text-red-500" size={48} />
              <h1 className="mt-4 text-lg font-semibold">Lien invalide</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Impossible de retrouver ce paiement.
              </p>
            </>
          )}
          <Link href={back || '/portal'} className="btn-primary mt-6 w-full">
            Retour à mon espace
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <PaymentReturn />
    </Suspense>
  );
}
