// Règles de calcul académiques : moyennes pondérées, mentions, rangs.

export interface WeightedScore {
  /** Note ramenée sur 20 */
  scoreOn20: number;
  coefficient: number;
}

/** Ramène une note sur 20 quel que soit son barème d'origine. */
export const normalizeOn20 = (score: number, maxScore: number): number => {
  if (maxScore <= 0) return 0;
  return (score / maxScore) * 20;
};

/** Moyenne pondérée par les coefficients, arrondie à 2 décimales. */
export const weightedAverage = (scores: WeightedScore[]): number => {
  const totalCoef = scores.reduce((sum, s) => sum + s.coefficient, 0);
  if (totalCoef === 0) return 0;
  const total = scores.reduce((sum, s) => sum + s.scoreOn20 * s.coefficient, 0);
  return Math.round((total / totalCoef) * 100) / 100;
};

/** Mention selon les barèmes usuels de l'enseignement francophone. */
export const mentionFor = (average: number): string => {
  if (average >= 18) return 'Excellent';
  if (average >= 16) return 'Très Bien';
  if (average >= 14) return 'Bien';
  if (average >= 12) return 'Assez Bien';
  if (average >= 10) return 'Passable';
  if (average >= 8) return 'Insuffisant';
  return 'Très Insuffisant';
};

export const appreciationFor = (average: number): string => {
  if (average >= 16) return 'Excellent travail, continuez ainsi !';
  if (average >= 14) return 'Bon travail, des résultats solides.';
  if (average >= 12) return 'Travail satisfaisant, peut encore progresser.';
  if (average >= 10) return 'Résultats moyens, des efforts sont attendus.';
  if (average >= 8) return 'Résultats insuffisants, un soutien est recommandé.';
  return 'Grandes difficultés, un accompagnement renforcé est nécessaire.';
};

/**
 * Classement dense (ex-aequo partagent le même rang) :
 * moyennes [15, 15, 12] → rangs [1, 1, 3].
 */
export const rankStudents = <T extends { average: number }>(
  rows: T[],
): (T & { rank: number })[] => {
  const sorted = [...rows].sort((a, b) => b.average - a.average);
  let lastAverage = Number.NaN;
  let lastRank = 0;
  return sorted.map((row, index) => {
    const rank = row.average === lastAverage ? lastRank : index + 1;
    lastAverage = row.average;
    lastRank = rank;
    return { ...row, rank };
  });
};
