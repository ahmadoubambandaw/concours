import { describe, expect, it } from 'vitest';
import {
  mentionFor,
  normalizeOn20,
  rankStudents,
  weightedAverage,
} from './academics';

describe('normalizeOn20', () => {
  it('ramène une note sur 20 quel que soit le barème', () => {
    expect(normalizeOn20(15, 20)).toBe(15);
    expect(normalizeOn20(5, 10)).toBe(10);
    expect(normalizeOn20(45, 50)).toBe(18);
  });

  it('retourne 0 pour un barème invalide', () => {
    expect(normalizeOn20(10, 0)).toBe(0);
  });
});

describe('weightedAverage', () => {
  it('calcule une moyenne pondérée par les coefficients', () => {
    // (15×4 + 10×2) / 6 = 80/6 ≈ 13.33
    expect(
      weightedAverage([
        { scoreOn20: 15, coefficient: 4 },
        { scoreOn20: 10, coefficient: 2 },
      ]),
    ).toBe(13.33);
  });

  it('retourne 0 sans note', () => {
    expect(weightedAverage([])).toBe(0);
  });

  it('gère un seul élément', () => {
    expect(weightedAverage([{ scoreOn20: 12.5, coefficient: 3 }])).toBe(12.5);
  });
});

describe('mentionFor', () => {
  it('applique le barème francophone', () => {
    expect(mentionFor(18.5)).toBe('Excellent');
    expect(mentionFor(16)).toBe('Très Bien');
    expect(mentionFor(14)).toBe('Bien');
    expect(mentionFor(12)).toBe('Assez Bien');
    expect(mentionFor(10)).toBe('Passable');
    expect(mentionFor(9)).toBe('Insuffisant');
    expect(mentionFor(4)).toBe('Très Insuffisant');
  });
});

describe('rankStudents', () => {
  it('classe par moyenne décroissante', () => {
    const ranked = rankStudents([
      { average: 12 },
      { average: 17 },
      { average: 9 },
    ]);
    expect(ranked.map((r) => [r.average, r.rank])).toEqual([
      [17, 1],
      [12, 2],
      [9, 3],
    ]);
  });

  it('les ex-aequo partagent le même rang (classement dense)', () => {
    const ranked = rankStudents([
      { average: 15 },
      { average: 15 },
      { average: 12 },
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });
});
