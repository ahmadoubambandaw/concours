// Intégration PayDunya — agrégateur de paiement ouest-africain
// (Orange Money, Wave, Free Money, cartes bancaires…).
//
// Flux :
//   1. createCheckoutInvoice() crée une facture de paiement et renvoie
//      l'URL de redirection (page de paiement hébergée par PayDunya).
//   2. L'élève/parent paie sur cette page.
//   3. PayDunya notifie notre callback IPN ; on confirme le statut réel
//      via confirmInvoice() avant d'enregistrer le paiement (jamais se
//      fier au seul POST du callback).
//
// Docs : https://paydunya.com/developers

import { env } from '../config/env';

const baseUrl = () =>
  // Override explicite (tests/staging) sinon endpoint standard selon le mode.
  process.env.PAYDUNYA_BASE_URL ||
  (env.paydunya.mode === 'live'
    ? 'https://app.paydunya.com/api/v1'
    : 'https://app.paydunya.com/sandbox-api/v1');

const headers = () => ({
  'Content-Type': 'application/json',
  'PAYDUNYA-MASTER-KEY': env.paydunya.masterKey,
  'PAYDUNYA-PRIVATE-KEY': env.paydunya.privateKey,
  'PAYDUNYA-TOKEN': env.paydunya.token,
});

export interface CheckoutParams {
  totalAmount: number; // en devise entière (XOF)
  description: string;
  storeName: string;
  callbackUrl: string; // IPN serveur → notre webhook
  returnUrl: string; // redirection navigateur après paiement
  cancelUrl: string;
  /** Données renvoyées telles quelles dans l'IPN (réconciliation). */
  customData: Record<string, string>;
  currency?: string;
}

export interface CheckoutResult {
  token: string;
  checkoutUrl: string;
}

/** Crée une facture de paiement PayDunya et renvoie l'URL de redirection. */
export const createCheckoutInvoice = async (params: CheckoutParams): Promise<CheckoutResult> => {
  const body = {
    invoice: {
      total_amount: params.totalAmount,
      description: params.description,
    },
    store: { name: params.storeName },
    custom_data: params.customData,
    actions: {
      callback_url: params.callbackUrl,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
    },
  };

  const res = await fetch(`${baseUrl()}/checkout-invoice/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  // PayDunya : response_code '00' = succès.
  if (!res.ok || data.response_code !== '00') {
    throw new Error(data.response_text || 'Échec de la création du paiement PayDunya');
  }
  return { token: data.token, checkoutUrl: data.response_text };
};

export type PaymentStatus = 'completed' | 'pending' | 'cancelled' | 'failed';

/** Normalise le statut brut renvoyé par PayDunya. */
export const mapPaydunyaStatus = (raw: string | undefined | null): PaymentStatus => {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'pending') return 'pending';
  return 'failed';
};

export interface ConfirmResult {
  status: PaymentStatus;
  totalAmount: number;
  customData: Record<string, string>;
  receiptUrl?: string;
  raw: any;
}

/** Vérifie le statut réel d'une facture de paiement auprès de PayDunya. */
export const confirmInvoice = async (token: string): Promise<ConfirmResult> => {
  const res = await fetch(`${baseUrl()}/checkout-invoice/confirm/${token}`, {
    headers: headers(),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.response_code !== '00') {
    throw new Error(data.response_text || 'Impossible de vérifier le paiement');
  }
  return {
    status: mapPaydunyaStatus(data.status),
    totalAmount: Math.round(Number(data.invoice?.total_amount ?? 0)),
    customData: data.custom_data ?? {},
    receiptUrl: data.receipt_url,
    raw: data,
  };
};
