import type { RelDimScores } from "./types";

export interface DivergenceItem {
  dimension: keyof RelDimScores;
  userAScore: number;
  userBScore: number;
  difference: number;
}

const REL_DIMENSIONS: (keyof RelDimScores)[] = [
  "emotional",
  "trust",
  "fairness",
  "stress",
  "autonomy",
];

/**
 * Compare two partners' relationship dimension scores and return
 * dimensions where the absolute difference is >= threshold (default 3).
 */
export function detectDivergence(
  scoresA: RelDimScores,
  scoresB: RelDimScores,
  threshold = 3,
): DivergenceItem[] {
  const items: DivergenceItem[] = [];

  for (const dim of REL_DIMENSIONS) {
    const diff = Math.abs(scoresA[dim] - scoresB[dim]);
    if (diff >= threshold) {
      items.push({
        dimension: dim,
        userAScore: scoresA[dim],
        userBScore: scoresB[dim],
        difference: diff,
      });
    }
  }

  // Sort by largest difference first
  items.sort((a, b) => b.difference - a.difference);
  return items;
}
