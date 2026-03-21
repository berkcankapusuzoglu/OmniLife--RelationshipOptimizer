import type { ConstraintViolation } from './types';

interface DailyLogData {
  date: string;
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

const DIMENSION_KEYS: { key: string; accessor: (log: DailyLogData) => number }[] = [
  { key: 'vitality', accessor: (l) => l.vitalityScore },
  { key: 'growth', accessor: (l) => l.growthScore },
  { key: 'security', accessor: (l) => l.securityScore },
  { key: 'connection', accessor: (l) => l.connectionScore },
  { key: 'emotional', accessor: (l) => l.emotionalScore },
  { key: 'trust', accessor: (l) => l.trustScore },
  { key: 'fairness', accessor: (l) => l.fairnessScore },
  { key: 'stress', accessor: (l) => l.stressScore },
  { key: 'autonomy', accessor: (l) => l.autonomyScore },
];

/**
 * Detect dimensions with 3+ consecutive day declines.
 * Logs must be sorted chronologically (oldest first).
 * Returns ConstraintViolation-compatible objects with type "trend".
 */
export function detectTrendViolations(
  history: DailyLogData[],
  windowSize = 5,
): ConstraintViolation[] {
  if (history.length < 3) return [];

  const window = history.slice(-windowSize);
  const violations: ConstraintViolation[] = [];

  for (const { key, accessor } of DIMENSION_KEYS) {
    let consecutiveDeclines = 0;

    for (let i = 1; i < window.length; i++) {
      if (accessor(window[i]) < accessor(window[i - 1])) {
        consecutiveDeclines++;
      } else {
        consecutiveDeclines = 0;
      }
    }

    if (consecutiveDeclines >= 3) {
      const latest = accessor(window[window.length - 1]);
      const earliest = accessor(window[window.length - 1 - consecutiveDeclines]);
      violations.push({
        constraintId: `trend-${key}`,
        constraintName: `Declining ${key}`,
        type: 'trend',
        dimension: key,
        actual: latest,
        threshold: earliest,
        severity: 'warning',
        penalty: 0, // trend violations don't add penalty, just trigger recommendations
      });
    }
  }

  return violations;
}
