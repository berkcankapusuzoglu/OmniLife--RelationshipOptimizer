import type {
  PillarScores,
  RelDimScores,
  ConstraintViolation,
  Recommendation,
} from '../engine/types';
import { EXERCISES } from './exercises';
import { THEORY_REFERENCES } from './psychology';

function pickExercise(
  targetDimension: string,
  recentExerciseIds: string[],
): string | undefined {
  const candidate = EXERCISES.find(
    (ex) =>
      ex.targetDimensions.includes(targetDimension) &&
      !recentExerciseIds.includes(ex.id),
  );
  return candidate?.id;
}

function theoryFor(name: string): string {
  const ref = THEORY_REFERENCES.find((t) => t.name === name);
  return ref ? ref.name : name;
}

function pillarVariance(pillars: PillarScores): number {
  const values = [
    pillars.vitality,
    pillars.growth,
    pillars.security,
    pillars.connection,
  ];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return (
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  );
}

function lowestRelDim(
  relDims: RelDimScores,
): { key: string; value: number } {
  const entries = Object.entries(relDims) as [string, number][];
  entries.sort((a, b) => a[1] - b[1]);
  return { key: entries[0][0], value: entries[0][1] };
}

function allDimsAbove(relDims: RelDimScores, threshold: number): boolean {
  return Object.values(relDims).every((v) => v > threshold);
}

/**
 * Generate priority-sorted recommendations based on current scores,
 * constraint violations, and recent exercise history.
 */
export function generateRecommendations(
  pillars: PillarScores,
  relDims: RelDimScores,
  violations: ConstraintViolation[],
  recentExerciseIds: string[],
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let idCounter = 1;

  const nextId = () => `rec-${String(idCounter++).padStart(3, '0')}`;

  // ── Rule 1: Below redline (critical constraint violation) ──
  const criticalViolations = violations.filter(
    (v) => v.severity === 'critical',
  );
  for (const violation of criticalViolations) {
    const exerciseId = pickExercise(violation.dimension, recentExerciseIds);
    recommendations.push({
      id: nextId(),
      type: 'urgent',
      title: `Critical: ${violation.constraintName} violated`,
      description: `Your ${violation.dimension} score (${violation.actual.toFixed(1)}) has fallen below the redline threshold (${violation.threshold}). Immediate attention is needed.${exerciseId ? ` Try exercise ${exerciseId}.` : ''}`,
      theoryBasis: theoryFor("Maslow's Hierarchy of Needs"),
      targetDimension: violation.dimension,
      priority: 10,
    });
  }

  // ── Rule 2: Any relationship dimension below 3 ──
  const relEntries = Object.entries(relDims) as [string, number][];
  for (const [dim, score] of relEntries) {
    if (score < 3) {
      const exerciseId = pickExercise(dim, recentExerciseIds);
      recommendations.push({
        id: nextId(),
        type: 'urgent',
        title: `Urgent: ${dim} critically low`,
        description: `Your ${dim} score is ${score.toFixed(1)}/10, well below healthy range.${exerciseId ? ` Recommended exercise: ${exerciseId}.` : ''} Focus here before other areas.`,
        theoryBasis: theoryFor('Attachment Theory'),
        targetDimension: dim,
        priority: 9,
      });
    }
  }

  // ── Rule 3: Declining 3+ day trend ──
  // Note: trend data is detected via warning-severity violations with type containing "trend"
  const trendViolations = violations.filter(
    (v) => v.severity === 'warning' && v.type.includes('trend'),
  );
  for (const violation of trendViolations) {
    const exerciseId = pickExercise(violation.dimension, recentExerciseIds);
    recommendations.push({
      id: nextId(),
      type: 'improvement',
      title: `Declining trend in ${violation.dimension}`,
      description: `Your ${violation.dimension} score has been declining. Intervene early to prevent further drop.${exerciseId ? ` Try exercise ${exerciseId}.` : ''}`,
      theoryBasis: theoryFor("Gottman's Sound Relationship House"),
      targetDimension: violation.dimension,
      priority: 7,
    });
  }

  // ── Rule 4: Fairness below 5 ──
  if (relDims.fairness < 5) {
    const exerciseId = pickExercise('fairness', recentExerciseIds);
    recommendations.push({
      id: nextId(),
      type: 'improvement',
      title: 'Rebalance needed: fairness is low',
      description: `Fairness is at ${relDims.fairness.toFixed(1)}/10. Perceived inequity erodes relationships over time.${exerciseId ? ` Suggested exercise: ${exerciseId}.` : ''}`,
      theoryBasis: theoryFor('Equity Theory'),
      targetDimension: 'fairness',
      priority: 6,
    });
  }

  // ── Rule 5: Stress above 7 ──
  if (relDims.stress > 7) {
    const exerciseId = pickExercise('stress', recentExerciseIds);
    recommendations.push({
      id: nextId(),
      type: 'improvement',
      title: 'High stress detected',
      description: `Stress level is ${relDims.stress.toFixed(1)}/10. Chronic stress undermines all other relationship dimensions.${exerciseId ? ` Try exercise ${exerciseId}.` : ''}`,
      theoryBasis: theoryFor('Emotional Intelligence'),
      targetDimension: 'stress',
      priority: 5,
    });
  }

  // ── Rule 6: High variance in pillars (imbalance) ──
  const variance = pillarVariance(pillars);
  if (variance > 4) {
    const pillarEntries = Object.entries(pillars) as [string, number][];
    pillarEntries.sort((a, b) => a[1] - b[1]);
    const weakest = pillarEntries[0];
    const exerciseId = pickExercise(weakest[0], recentExerciseIds);
    recommendations.push({
      id: nextId(),
      type: 'improvement',
      title: 'Life pillar imbalance detected',
      description: `Your life pillars are unevenly distributed (variance: ${variance.toFixed(1)}). ${weakest[0]} is the weakest at ${weakest[1].toFixed(1)}/10.${exerciseId ? ` Exercise ${exerciseId} may help.` : ''}`,
      theoryBasis: theoryFor('Circumplex Model'),
      targetDimension: weakest[0],
      priority: 4,
    });
  }

  // ── Rule 7: All dimensions above 6 → maintenance ──
  if (allDimsAbove(relDims, 6)) {
    const lowest = lowestRelDim(relDims);
    const exerciseId = pickExercise(lowest.key, recentExerciseIds);
    recommendations.push({
      id: nextId(),
      type: 'maintenance',
      title: 'Relationship is healthy — keep growing',
      description: `All dimensions are above 6. Focus on deepening your strengths and exploring new territory.${exerciseId ? ` Try exercise ${exerciseId} for continued growth.` : ''}`,
      theoryBasis: theoryFor('Positive Psychology (PERMA)'),
      targetDimension: lowest.key,
      priority: 2,
    });

    recommendations.push({
      id: nextId(),
      type: 'exploration',
      title: 'Explore flow together',
      description:
        'Your relationship is in a strong place. Consider a shared challenge that pushes both of you into flow state.',
      theoryBasis: theoryFor("Csikszentmihalyi's Flow"),
      targetDimension: 'emotional',
      priority: 2,
    });
  }

  // Sort by priority descending
  recommendations.sort((a, b) => b.priority - a.priority);

  return recommendations;
}
