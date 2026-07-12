export const formatMoney = (amount: number, currency = 'XOF'): string =>
  `${(amount ?? 0).toLocaleString('fr-FR')} ${currency === 'XOF' ? 'FCFA' : currency}`;

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const DAYS_FR = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrateur',
  SCHOOL_ADMIN: 'Administrateur',
  DIRECTOR: 'Directeur',
  PRINCIPAL: 'Proviseur',
  ACCOUNTANT: 'Comptable',
  SECRETARY: 'Secrétaire',
  TEACHER: 'Enseignant',
  PARENT: 'Parent',
  STUDENT: 'Élève',
  LIBRARIAN: 'Bibliothécaire',
  SUPERVISOR: 'Surveillant',
  NURSE: 'Infirmier(ère)',
  DRIVER: 'Chauffeur',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  WAVE: 'Wave',
  FREE_MONEY: 'Free Money',
  CARD: 'Carte bancaire',
  BANK_TRANSFER: 'Virement',
  STRIPE: 'Stripe',
  CHEQUE: 'Chèque',
};
