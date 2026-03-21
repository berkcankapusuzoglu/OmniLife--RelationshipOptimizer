import type { PillarScores, RelDimScores, Exercise } from '../engine/types';
import { getRecommendedExercises } from './engine';

export interface ActionPlanItem {
  dimension: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  exercises: { id: string; title: string; durationMinutes: number }[];
}

/**
 * Takes current scores and target scores (from optimizer or defaults),
 * computes deltas, and maps the largest gaps to exercises.
 */
export function generateActionPlan(
  pillars: PillarScores,
  relDims: RelDimScores,
  targetScores?: Partial<Record<string, number>>,
  scenarioMode = 'default',
): ActionPlanItem[] {
  const allDims: Record<string, number> = {
    vitality: pillars.vitality,
    growth: pillars.growth,
    security: pillars.security,
    connection: pillars.connection,
    emotional: relDims.emotional,
    trust: relDims.trust,
    fairness: relDims.fairness,
    stress: relDims.stress,
    autonomy: relDims.autonomy,
  };

  // Default target: 7 for each dimension, or use provided targets
  const targets: Record<string, number> = {};
  for (const key of Object.keys(allDims)) {
    targets[key] = targetScores?.[key] ?? 7;
  }

  // Compute gaps (only where current < target)
  const gaps: { dimension: string; current: number; target: number; gap: number }[] = [];
  for (const [dim, current] of Object.entries(allDims)) {
    // For stress, invert: gap exists when stress is too high
    const effectiveCurrent = dim === 'stress' ? 10 - current : current;
    const effectiveTarget = dim === 'stress' ? 10 - (targets[dim] ?? 3) : targets[dim];
    const gap = effectiveTarget - effectiveCurrent;
    if (gap > 0) {
      gaps.push({ dimension: dim, current, target: targets[dim], gap });
    }
  }

  // Sort by largest gap first
  gaps.sort((a, b) => b.gap - a.gap);

  // Take top 5 gaps and find exercises for each
  const plan: ActionPlanItem[] = [];
  const usedExerciseIds: string[] = [];

  for (const { dimension, current, target, gap } of gaps.slice(0, 5)) {
    // Get exercises targeting this dimension
    const exercises = getRecommendedExercises(
      pillars,
      relDims,
      [],
      usedExerciseIds,
      scenarioMode,
    ).filter((ex) => ex.targetDimensions.includes(dimension));

    const topExercises = exercises.slice(0, 2);
    for (const ex of topExercises) {
      usedExerciseIds.push(ex.id);
    }

    plan.push({
      dimension,
      currentScore: current,
      targetScore: target,
      gap: Math.round(gap * 10) / 10,
      exercises: topExercises.map((ex) => ({
        id: ex.id,
        title: ex.title,
        durationMinutes: ex.durationMinutes,
      })),
    });
  }

  return plan;
}
