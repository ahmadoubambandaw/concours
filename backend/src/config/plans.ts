// Formules d'abonnement Scolaris (par fonctionnalités).
//
// Prix en devise entière (XOF). L'annuel applique « 2 mois offerts »
// (12 mois payés 10). Les limites et l'accès aux modules sont dérivés
// d'ici — pour ajuster l'offre, il suffit de modifier ce fichier.

import type { Plan } from '@prisma/client';

export type Feature =
  | 'finance' // factures, paiements, comptabilité
  | 'communication' // messages & annonces
  | 'timetable' // emplois du temps
  | 'services' // bibliothèque, cantine, transport
  | 'hr' // RH & paie
  | 'onlinePayments' // paiement en ligne PayDunya (parents)
  | 'messagingChannels' // envois réels SMS / WhatsApp / Email
  | 'ai' // assistant IA
  | 'multiSchool'; // réseau de plusieurs établissements

export interface PlanDef {
  key: Plan;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number; // 10 × mensuel (2 mois offerts)
  maxStudents: number | null; // null = illimité
  features: Feature[];
  highlights: string[];
}

// Modules toujours inclus (même en gratuit) : élèves, classes, matières,
// notes, bulletins, présences, discipline, infirmerie, calendrier, devoirs.
const STANDARD_FEATURES: Feature[] = ['finance', 'communication', 'timetable', 'services', 'hr'];
const PREMIUM_FEATURES: Feature[] = [
  ...STANDARD_FEATURES,
  'onlinePayments',
  'messagingChannels',
  'ai',
  'multiSchool',
];

export const PLANS: Record<Plan, PlanDef> = {
  DECOUVERTE: {
    key: 'DECOUVERTE',
    name: 'Découverte',
    tagline: 'Pour démarrer gratuitement',
    priceMonthly: 0,
    priceAnnual: 0,
    maxStudents: 60,
    features: [],
    highlights: [
      "Jusqu'à 60 élèves",
      'Élèves, classes, matières',
      'Notes & bulletins PDF',
      'Présences',
      'Discipline & infirmerie',
    ],
  },
  STANDARD: {
    key: 'STANDARD',
    name: 'Standard',
    tagline: 'Pour gérer tout l\'établissement',
    priceMonthly: 15000,
    priceAnnual: 150000,
    maxStudents: 400,
    features: STANDARD_FEATURES,
    highlights: [
      "Jusqu'à 400 élèves",
      'Tout Découverte, plus :',
      'Finances (factures, paiements, caisse)',
      'Communication & annonces',
      'Emplois du temps',
      'Bibliothèque, cantine, transport',
      'RH & paie',
    ],
  },
  PREMIUM: {
    key: 'PREMIUM',
    name: 'Premium',
    tagline: 'Pour aller plus loin',
    priceMonthly: 35000,
    priceAnnual: 350000,
    maxStudents: null,
    features: PREMIUM_FEATURES,
    highlights: [
      'Élèves illimités',
      'Tout Standard, plus :',
      'Paiement en ligne des parents (PayDunya)',
      'SMS / WhatsApp / Email réels',
      'Assistant IA',
      'Réseau multi-établissements',
    ],
  },
};

export const PLAN_ORDER: Plan[] = ['DECOUVERTE', 'STANDARD', 'PREMIUM'];

/**
 * Formule effective d'un établissement : si l'abonnement payant a expiré,
 * on retombe sur Découverte (gratuit). planExpiresAt null = permanent.
 */
export const effectivePlan = (school: { plan: Plan; planExpiresAt: Date | null }): Plan => {
  if (school.planExpiresAt && school.planExpiresAt.getTime() < Date.now()) {
    return 'DECOUVERTE';
  }
  return school.plan;
};

export const hasFeature = (plan: Plan, feature: Feature): boolean =>
  PLANS[plan].features.includes(feature);

export const maxStudentsFor = (plan: Plan): number | null => PLANS[plan].maxStudents;

/** Montant et durée (mois) d'une souscription selon la périodicité. */
export const priceFor = (plan: Plan, cycle: 'MONTHLY' | 'ANNUAL') => {
  const def = PLANS[plan];
  return cycle === 'ANNUAL'
    ? { amount: def.priceAnnual, months: 12 }
    : { amount: def.priceMonthly, months: 1 };
};
