import { describe, expect, it } from 'vitest';
import { toE164 } from './notify';

describe('toE164', () => {
  it('conserve un numéro international déjà formaté', () => {
    expect(toE164('+221771234567')).toBe('+221771234567');
    expect(toE164('+33 6 12 34 56 78')).toBe('+33612345678');
  });

  it('nettoie les espaces et séparateurs', () => {
    expect(toE164('+221 77 123 45 67')).toBe('+221771234567');
    expect(toE164('221-77-123-45-67')).toBe('+221771234567');
  });

  it('préfixe un numéro local sénégalais (9 chiffres) avec +221', () => {
    expect(toE164('771234567')).toBe('+221771234567');
  });

  it('convertit le préfixe 00 en +', () => {
    expect(toE164('00221771234567')).toBe('+221771234567');
  });

  it('respecte un pays par défaut personnalisé', () => {
    expect(toE164('612345678', '33')).toBe('+33612345678');
  });
});
