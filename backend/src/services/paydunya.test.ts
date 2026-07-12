import { describe, expect, it } from 'vitest';
import { mapPaydunyaStatus } from './paydunya';

describe('mapPaydunyaStatus', () => {
  it('reconnaît un paiement abouti', () => {
    expect(mapPaydunyaStatus('completed')).toBe('completed');
    expect(mapPaydunyaStatus('COMPLETED')).toBe('completed');
  });

  it('reconnaît une annulation (orthographes US/UK)', () => {
    expect(mapPaydunyaStatus('cancelled')).toBe('cancelled');
    expect(mapPaydunyaStatus('canceled')).toBe('cancelled');
  });

  it('reconnaît un paiement en attente', () => {
    expect(mapPaydunyaStatus('pending')).toBe('pending');
  });

  it('traite tout statut inconnu ou vide comme un échec', () => {
    expect(mapPaydunyaStatus('')).toBe('failed');
    expect(mapPaydunyaStatus(undefined)).toBe('failed');
    expect(mapPaydunyaStatus('bizarre')).toBe('failed');
  });
});
