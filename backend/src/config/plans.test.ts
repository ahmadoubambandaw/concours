import { describe, expect, it } from 'vitest';
import { effectivePlan, hasFeature, maxStudentsFor, priceFor, PLANS } from './plans';

describe('priceFor', () => {
  it('mensuel = prix mensuel, 1 mois', () => {
    expect(priceFor('STANDARD', 'MONTHLY')).toEqual({ amount: 15000, months: 1 });
  });
  it('annuel = 2 mois offerts (10× mensuel), 12 mois', () => {
    expect(priceFor('STANDARD', 'ANNUAL')).toEqual({ amount: 150000, months: 12 });
    expect(priceFor('PREMIUM', 'ANNUAL')).toEqual({ amount: 350000, months: 12 });
    // Vérifie la remise « 2 mois offerts ».
    expect(PLANS.STANDARD.priceAnnual).toBe(PLANS.STANDARD.priceMonthly * 10);
  });
});

describe('effectivePlan', () => {
  it('plan permanent (pas d\'expiration) reste tel quel', () => {
    expect(effectivePlan({ plan: 'PREMIUM', planExpiresAt: null })).toBe('PREMIUM');
  });
  it('plan payant non expiré reste actif', () => {
    const future = new Date(Date.now() + 86400000);
    expect(effectivePlan({ plan: 'STANDARD', planExpiresAt: future })).toBe('STANDARD');
  });
  it('plan expiré retombe sur Découverte', () => {
    const past = new Date(Date.now() - 86400000);
    expect(effectivePlan({ plan: 'PREMIUM', planExpiresAt: past })).toBe('DECOUVERTE');
  });
});

describe('features & limites', () => {
  it('Découverte : essentiels seulement, 60 élèves', () => {
    expect(maxStudentsFor('DECOUVERTE')).toBe(60);
    expect(hasFeature('DECOUVERTE', 'finance')).toBe(false);
    expect(hasFeature('DECOUVERTE', 'ai')).toBe(false);
  });
  it('Standard : modules de gestion, 400 élèves, pas de premium', () => {
    expect(maxStudentsFor('STANDARD')).toBe(400);
    expect(hasFeature('STANDARD', 'finance')).toBe(true);
    expect(hasFeature('STANDARD', 'hr')).toBe(true);
    expect(hasFeature('STANDARD', 'onlinePayments')).toBe(false);
    expect(hasFeature('STANDARD', 'ai')).toBe(false);
  });
  it('Premium : tout, illimité', () => {
    expect(maxStudentsFor('PREMIUM')).toBeNull();
    expect(hasFeature('PREMIUM', 'onlinePayments')).toBe(true);
    expect(hasFeature('PREMIUM', 'messagingChannels')).toBe(true);
    expect(hasFeature('PREMIUM', 'ai')).toBe(true);
  });
});
