'use client';

// Bouton « Payer en ligne » : lance un paiement PayDunya pour une facture
// et redirige le navigateur vers la page de paiement (Orange Money, Wave,
// Free Money, carte). Le retour et la confirmation sont gérés par
// /paiement/retour.

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { api } from '@/lib/api';

export const PayOnlineButton = ({
  invoiceId,
  small = false,
}: {
  invoiceId: string;
  small?: boolean;
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pay = async () => {
    setLoading(true);
    setError('');
    try {
      const { checkoutUrl } = await api('/finance/online/checkout', {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      });
      // Mémorise le retour attendu pour recharger la bonne page ensuite.
      sessionStorage.setItem('scolaris.payReturn', window.location.pathname);
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={pay}
        disabled={loading}
        className={`btn-primary ${small ? '!px-2.5 !py-1.5 text-xs' : ''}`}
        title="Payer en ligne (Orange Money, Wave, carte…)"
      >
        <CreditCard size={small ? 13 : 16} />
        {loading ? 'Redirection…' : 'Payer en ligne'}
      </button>
      {error && <span className="max-w-48 text-right text-[11px] text-red-500">{error}</span>}
    </div>
  );
};
