import type {
  PillarScores,
  RelDimScores,
  ConstraintViolation,
  Recommendation,
} from '../engine/types';
import { EXERCISES } from './exercises';
import { THEORY_REFERENCES } from './psychology';

export interface ParetoRuleInput {
  isOnFrontier: boolean;
  nearestFrontierPoint: { lifeScore: number; relScore: number } | null;
  currentLifeScore: number;
  currentRelScore: number;
  laggingDimensions: string[];
}

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

const ACTION_STEPS: Record<string, string[]> = {
  trust: [
    "Have one honest conversation today without defensiveness",
    "Follow through on one small promise you made this week",
  ],
  emotional: [
    "Spend 10 minutes talking about feelings without problem-solving",
    "Name your emotion before reacting today",
  ],
  fairness: [
    "List 3 things your partner does that you appreciate this week",
    "Ask your partner if they feel the load is balanced",
  ],
  stress: [
    "Try 5 minutes of box breathing (4s in, 4s hold, 4s out, 4s hold)",
    "Identify one stressor you can delegate or eliminate today",
  ],
  autonomy: [
    "Schedule one solo activity you enjoy this week",
    "Discuss with your partner one personal goal you want to pursue",
  ],
  vitality: [
    "Take a 20-minute walk today",
    "Sleep 30 minutes earlier than usual tonight",
  ],
  growth: [
    "Read or listen to something educational for 15 minutes",
    "Write down one goal and one small step to start today",
  ],
  security: [
    "Review your monthly budget and identify one area to improve",
    "Talk to your partner about one financial or safety concern",
  ],
  connection: [
    "Reach out to one friend or family member today",
    "Plan a social activity for this weekend",
  ],
  imbalance: [
    "Identify your lowest scoring area and do one small action to improve it",
    "Discuss your current balance with your partner",
  ],
  pareto: [
    "Focus on your top lagging dimension for the next 3 days",
    "Log daily for a week to get better optimization data",
  ],
};

const RESOURCE_LINKS: Record<string, { label: string; url: string }[]> = {
  trust: [
    { label: "Gottman: Building Trust", url: "https://www.gottman.com/blog/trust-the-foundation-of-relationships/" },
  ],
  emotional: [
    { label: "Emotional Validation Guide", url: "https://www.gottman.com/blog/an-introduction-to-emotional-validation/" },
  ],
  fairness: [
    { label: "Equity in Relationships", url: "https://www.psychologytoday.com/us/blog/the-attraction-doctor/201105/equity-theory" },
  ],
  stress: [
    { label: "Stress Relief Techniques", url: "https://www.helpguide.org/articles/stress/stress-management.htm" },
  ],
  autonomy: [
    { label: "Healthy Independence in Relationships", url: "https://www.psychologytoday.com/us/blog/living-single/202105/why-autonomy-matters-in-close-relationships" },
  ],
  vitality: [
    { label: "Building Energy and Vitality", url: "https://www.helpguide.org/articles/healthy-living/how-to-have-more-energy.htm" },
  ],
  growth: [
    { label: "Personal Growth Strategies", url: "https://www.mindtools.com/pages/article/personal-development.htm" },
  ],
  security: [
    { label: "Financial Security Planning", url: "https://www.consumer.ftc.gov/topics/money-credit" },
  ],
  connection: [
    { label: "Building Stronger Social Connections", url: "https://www.helpguide.org/articles/relationships-communication/making-good-friends.htm" },
  ],
  imbalance: [
    { label: "Life Balance Assessment", url: "https://www.mindtools.com/pages/article/newHTE_93.htm" },
  ],
  pareto: [
    { label: "Habit Stacking for Improvement", url: "https://jamesclear.com/habit-stacking" },
  ],
};

/**
 * Generate priority-sorted recommendations based on current scores,
 * constraint violations, and recent exercise history.
 */
export function generateRecommendations(
  pillars: PillarScores,
  relDims: RelDimScores,
  violations: ConstraintViolation[],
  recentExerciseIds: string[],
  paretoInput?: ParetoRuleInput,
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
    const dim = violation.dimension;
    recommendations.push({
      id: nextId(),
      type: 'urgent',
      title: `Critical: ${violation.constraintName} violated`,
      description: `Your ${dim} score (${violation.actual.toFixed(1)}) has fallen below the redline threshold (${violation.threshold}). Immediate attention is needed.${exerciseId ? ` Try exercise ${exerciseId}.` : ''}`,
      theoryBasis: theoryFor("Maslow's Hierarchy of Needs"),
      targetDimension: dim,
      priority: 10,
      actionSteps: ACTION_STEPS[dim] ?? ACTION_STEPS.imbalance,
      resourceLinks: RESOURCE_LINKS[dim] ?? RESOURCE_LINKS.imbalance,
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
        actionSteps: ACTION_STEPS[dim] ?? ACTION_STEPS.imbalance,
        resourceLinks: RESOURCE_LINKS[dim] ?? RESOURCE_LINKS.imbalance,
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
    const dim = violation.dimension;
    recommendations.push({
      id: nextId(),
      type: 'improvement',
      title: `Declining trend in ${dim}`,
      description: `Your ${dim} score has been declining. Intervene early to prevent further drop.${exerciseId ? ` Try exercise ${exerciseId}.` : ''}`,
      theoryBasis: theoryFor("Gottman's Sound Relationship House"),
      targetDimension: dim,
      priority: 7,
      actionSteps: ACTION_STEPS[dim] ?? ACTION_STEPS.imbalance,
      resourceLinks: RESOURCE_LINKS[dim] ?? RESOURCE_LINKS.imbalance,
    });
  }

  // ── Rule 3b: Pareto frontier — off the frontier ──
  if (paretoInput && !paretoInput.isOnFrontier && paretoInput.nearestFrontierPoint) {
    const { nearestFrontierPoint, currentLifeScore, currentRelScore, laggingDimensions } = paretoInput;
    const primaryLag = laggingDimensions[0] ?? 'emotional';
    const exerciseId = pickExercise(primaryLag, recentExerciseIds);
    const lifeGap = Math.round((nearestFrontierPoint.lifeScore - currentLifeScore) * 10) / 10;
    const relGap = Math.round((nearestFrontierPoint.relScore - currentRelScore) * 10) / 10;
    recommendations.push({
      id: nextId(),
      type: 'improvement',
      title: "You're below your historical best",
      description: `Your past self achieved Life ${nearestFrontierPoint.lifeScore.toFixed(1)} / Rel ${nearestFrontierPoint.relScore.toFixed(1)}. You're currently ${lifeGap > 0 ? lifeGap + ' life points' : ''} ${relGap > 0 ? (lifeGap > 0 ? 'and ' : '') + relGap + ' rel points' : ''} behind that peak. Focus on ${laggingDimensions.slice(0, 2).join(' and ')} to return to the frontier.${exerciseId ? ` Try exercise ${exerciseId}.` : ''}`,
      theoryBasis: theoryFor('Positive Psychology (PERMA)'),
      targetDimension: primaryLag,
      priority: 8,
      actionSteps: ACTION_STEPS.pareto,
      resourceLinks: RESOURCE_LINKS.pareto,
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
      actionSteps: ACTION_STEPS.fairness,
      resourceLinks: RESOURCE_LINKS.fairness,
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
      actionSteps: ACTION_STEPS.stress,
      resourceLinks: RESOURCE_LINKS.stress,
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
      actionSteps: ACTION_STEPS[weakest[0]] ?? ACTION_STEPS.imbalance,
      resourceLinks: RESOURCE_LINKS[weakest[0]] ?? RESOURCE_LINKS.imbalance,
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
      actionSteps: ACTION_STEPS[lowest.key] ?? ACTION_STEPS.connection,
      resourceLinks: RESOURCE_LINKS[lowest.key] ?? RESOURCE_LINKS.connection,
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
      actionSteps: ACTION_STEPS.emotional,
      resourceLinks: RESOURCE_LINKS.emotional,
    });
  }

  // Sort by priority descending
  recommendations.sort((a, b) => b.priority - a.priority);

  return recommendations;
}
