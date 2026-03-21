import type { Weights } from "./types";

interface LogEntry {
  vitalityScore: number;
  growthScore: number;
  securityScore: number;
  connectionScore: number;
  emotionalScore: number;
  trustScore: number;
  fairnessScore: number;
  stressScore: number;
  autonomyScore: number;
}

interface ScoreEntry {
  totalQuality: number;
}

export interface WeightSuggestion {
  dimension: string;
  label: string;
  currentWeight: number;
  suggestedWeight: number;
  delta: number;
  reasoning: string;
  group: "pillar" | "rel";
}

export interface CalibrationResult {
  eligible: boolean;
  suggestions: WeightSuggestion[];
  summary: string;
}

const PILLAR_KEYS = ["vitality", "growth", "security", "connection"] as const;
const REL_KEYS = ["emotional", "trust", "fairness", "stress", "autonomy"] as const;

const PILLAR_LABELS: Record<string, string> = {
  vitality: "Vitality",
  growth: "Growth",
  security: "Security",
  connection: "Connection",
};

const REL_LABELS: Record<string, string> = {
  emotional: "Emotional",
  trust: "Trust",
  fairness: "Fairness",
  stress: "Stress Management",
  autonomy: "Autonomy",
};

function getLogDimensionValue(log: LogEntry, dim: string): number {
  const map: Record<string, number> = {
    vitality: log.vitalityScore,
    growth: log.growthScore,
    security: log.securityScore,
    connection: log.connectionScore,
    emotional: log.emotionalScore,
    trust: log.trustScore,
    fairness: log.fairnessScore,
    stress: log.stressScore,
    autonomy: log.autonomyScore,
  };
  return map[dim] ?? 0;
}

/**
 * Compute Pearson correlation coefficient between two arrays.
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return 0;
  return num / denom;
}

/**
 * After 14+ days of data, analyze dimension-to-quality correlations
 * and suggest weight adjustments.
 */
export function computeWeightSuggestions(
  logs: LogEntry[],
  scores: ScoreEntry[],
  currentWeights: Weights
): CalibrationResult {
  if (logs.length < 14 || scores.length < 14) {
    return {
      eligible: false,
      suggestions: [],
      summary: `Need at least 14 days of data for calibration. Currently have ${logs.length} days.`,
    };
  }

  // Use the minimum of logs and scores length
  const n = Math.min(logs.length, scores.length);
  const qualityValues = scores.slice(0, n).map((s) => Number(s.totalQuality));

  const suggestions: WeightSuggestion[] = [];

  // Analyze pillar dimensions
  for (const key of PILLAR_KEYS) {
    const dimValues = logs.slice(0, n).map((l) => getLogDimensionValue(l, key));
    const corr = pearsonCorrelation(dimValues, qualityValues);
    const currentWeight = currentWeights.pillar[key];

    // If correlation is significantly positive, this dimension strongly affects quality
    // Suggest increasing weight for strongly correlated dimensions
    // and decreasing for weakly/negatively correlated ones
    const absCorr = Math.abs(corr);
    const targetWeight = normalizeTarget(absCorr, PILLAR_KEYS.length);
    const delta = targetWeight - currentWeight;

    if (Math.abs(delta) > 0.03) {
      let reasoning: string;
      if (corr > 0.3) {
        reasoning = `${PILLAR_LABELS[key]} shows a strong positive correlation (${corr.toFixed(2)}) with your Total Quality score. Increasing its weight may better reflect its importance.`;
      } else if (corr < -0.1) {
        reasoning = `${PILLAR_LABELS[key]} shows a negative correlation (${corr.toFixed(2)}) with Total Quality. This may indicate it's overweighted relative to your priorities.`;
      } else {
        reasoning = `${PILLAR_LABELS[key]} has a weak correlation (${corr.toFixed(2)}) with Total Quality. Consider adjusting its weight to match your actual priorities.`;
      }

      suggestions.push({
        dimension: key,
        label: PILLAR_LABELS[key],
        currentWeight,
        suggestedWeight: Math.round(targetWeight * 100) / 100,
        delta: Math.round(delta * 100) / 100,
        reasoning,
        group: "pillar",
      });
    }
  }

  // Analyze relationship dimensions
  for (const key of REL_KEYS) {
    const dimValues = logs.slice(0, n).map((l) => getLogDimensionValue(l, key));
    // For stress, invert since lower stress = better
    const adjustedValues =
      key === "stress" ? dimValues.map((v) => 10 - v) : dimValues;
    const corr = pearsonCorrelation(adjustedValues, qualityValues);
    const currentWeight = currentWeights.rel[key];

    const absCorr = Math.abs(corr);
    const targetWeight = normalizeTarget(absCorr, REL_KEYS.length);
    const delta = targetWeight - currentWeight;

    if (Math.abs(delta) > 0.03) {
      let reasoning: string;
      if (corr > 0.3) {
        reasoning = `${REL_LABELS[key]} strongly correlates (${corr.toFixed(2)}) with Total Quality. It may deserve more weight.`;
      } else if (corr < -0.1) {
        reasoning = `${REL_LABELS[key]} negatively correlates (${corr.toFixed(2)}) with Total Quality. Its current weight may be too high.`;
      } else {
        reasoning = `${REL_LABELS[key]} has minimal correlation (${corr.toFixed(2)}) with your outcomes. Review if this matches your priorities.`;
      }

      suggestions.push({
        dimension: key,
        label: REL_LABELS[key],
        currentWeight,
        suggestedWeight: Math.round(targetWeight * 100) / 100,
        delta: Math.round(delta * 100) / 100,
        reasoning,
        group: "rel",
      });
    }
  }

  const summary =
    suggestions.length === 0
      ? "Your current weights are well-calibrated! No significant adjustments needed."
      : `Based on ${n} days of data, we found ${suggestions.length} weight adjustment${suggestions.length !== 1 ? "s" : ""} that could better reflect your actual priorities.`;

  return {
    eligible: true,
    suggestions,
    summary,
  };
}

/**
 * Convert a correlation magnitude to a target weight, given how many dimensions
 * share the group. A perfectly equal distribution would give 1/count to each.
 * We blend towards the correlation-based value.
 */
function normalizeTarget(absCorrelation: number, groupSize: number): number {
  const equalWeight = 1 / groupSize;
  // Blend: 60% correlation-driven, 40% equal weight (to avoid extreme suggestions)
  const corrWeight = absCorrelation;
  const blended = 0.6 * corrWeight + 0.4 * equalWeight;
  // Clamp between 0.05 and 0.6
  return Math.max(0.05, Math.min(0.6, blended));
}
