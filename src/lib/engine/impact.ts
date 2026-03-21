interface CompletedIntervention {
  type: string;
  title: string;
  targetDimension: string | null;
  scoreBefore: string | null;
  scoreAfter: string | null;
}

export interface DimensionImpact {
  dimension: string;
  avgChange: number;
  count: number;
}

export interface ExerciseImpact {
  exerciseId: string;
  title: string;
  avgChange: number;
  count: number;
}

export interface ImpactSummary {
  byDimension: DimensionImpact[];
  byExercise: ExerciseImpact[];
  mostEffective: ExerciseImpact | null;
}

/**
 * Analyze completed interventions that have both scoreBefore and scoreAfter.
 */
export function computeInterventionImpact(
  interventions: CompletedIntervention[],
): ImpactSummary {
  const withScores = interventions.filter(
    (i) => i.scoreBefore !== null && i.scoreAfter !== null && i.targetDimension,
  );

  // By dimension
  const dimMap = new Map<string, { total: number; count: number }>();
  for (const i of withScores) {
    const change = Number(i.scoreAfter) - Number(i.scoreBefore);
    const dim = i.targetDimension!;
    const existing = dimMap.get(dim) ?? { total: 0, count: 0 };
    existing.total += change;
    existing.count++;
    dimMap.set(dim, existing);
  }

  const byDimension: DimensionImpact[] = Array.from(dimMap.entries()).map(
    ([dimension, { total, count }]) => ({
      dimension,
      avgChange: Math.round((total / count) * 100) / 100,
      count,
    }),
  );

  // By exercise
  const exMap = new Map<string, { title: string; total: number; count: number }>();
  for (const i of withScores) {
    const change = Number(i.scoreAfter) - Number(i.scoreBefore);
    const existing = exMap.get(i.type) ?? { title: i.title, total: 0, count: 0 };
    existing.total += change;
    existing.count++;
    exMap.set(i.type, existing);
  }

  const byExercise: ExerciseImpact[] = Array.from(exMap.entries()).map(
    ([exerciseId, { title, total, count }]) => ({
      exerciseId,
      title,
      avgChange: Math.round((total / count) * 100) / 100,
      count,
    }),
  );

  byExercise.sort((a, b) => b.avgChange - a.avgChange);

  return {
    byDimension,
    byExercise,
    mostEffective: byExercise[0] ?? null,
  };
}
