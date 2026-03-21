import { PillarScores, RelDimScores, PillarWeights, RelWeights, Weights } from './types';

// Normalize weights so they sum to 1
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum === 0) return weights;
  const result: Record<string, number> = {};
  for (const key in weights) {
    result[key] = weights[key] / sum;
  }
  return result;
}

// LifeScore = (w_v * vitality + w_g * growth + w_s * security + w_c * connection) * 10
export function computeLifeScore(pillars: PillarScores, weights: PillarWeights): number {
  const w = normalizeWeights({ ...weights });
  const raw = w.vitality * pillars.vitality + w.growth * pillars.growth +
              w.security * pillars.security + w.connection * pillars.connection;
  return Math.round(raw * 10 * 100) / 100; // 0-100, 2 decimal places
}

// RelScore = (w_e * emotional + w_t * trust + w_f * fairness + w_st * stress + w_a * autonomy) * 10
export function computeRelScore(dims: RelDimScores, weights: RelWeights): number {
  const w = normalizeWeights({ ...weights });
  const raw = w.emotional * dims.emotional + w.trust * dims.trust +
              w.fairness * dims.fairness + w.stress * (10 - dims.stress) + w.autonomy * dims.autonomy;
  return Math.round(raw * 10 * 100) / 100;
}

// TotalQuality = alpha * LifeScore + beta * RelScore - penalties
export function computeTotalQuality(lifeScore: number, relScore: number, alpha: number, beta: number, totalPenalty: number): number {
  const ab = normalizeWeights({ alpha, beta });
  const raw = ab.alpha * lifeScore + ab.beta * relScore - totalPenalty;
  return Math.round(Math.max(0, Math.min(100, raw)) * 100) / 100;
}

// Compute all scores together
export function computeAllScores(
  pillars: PillarScores,
  relDims: RelDimScores,
  weights: Weights,
  totalPenalty: number
): { lifeScore: number; relScore: number; totalQuality: number } {
  const lifeScore = computeLifeScore(pillars, weights.pillar);
  const relScore = computeRelScore(relDims, weights.rel);
  const totalQuality = computeTotalQuality(lifeScore, relScore, weights.alpha, weights.beta, totalPenalty);
  return { lifeScore, relScore, totalQuality };
}
