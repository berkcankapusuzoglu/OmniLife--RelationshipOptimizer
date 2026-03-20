import type {
  PillarScores,
  RelDimScores,
  ConstraintViolation,
  Exercise,
} from '../engine/types';
import { EXERCISES } from './exercises';
import { generateRecommendations } from './rules';

type ScenarioMode =
  | 'default'
  | 'exam'
  | 'chill'
  | 'newborn'
  | 'crisis'
  | 'long_distance'
  | 'custom';

/** Maximum exercises to return per call. */
const MAX_RESULTS = 3;

/** Maximum duration (minutes) for scenario-constrained exercises. */
const SCENARIO_DURATION_LIMITS: Partial<Record<ScenarioMode, number>> = {
  exam: 10,
  newborn: 10,
  crisis: 15,
};

/** Categories favored by each scenario mode. */
const SCENARIO_PREFERRED_CATEGORIES: Partial<
  Record<ScenarioMode, string[]>
> = {
  exam: ['stress', 'communication', 'autonomy'],
  chill: ['intimacy', 'emotional', 'trust'],
  newborn: ['stress', 'emotional', 'fairness'],
  crisis: ['stress', 'emotional', 'communication'],
  long_distance: ['trust', 'emotional', 'communication', 'autonomy'],
};

/**
 * Score an exercise based on how well it matches current needs.
 * Higher score = better fit.
 */
function scoreExercise(
  exercise: Exercise,
  targetDimensions: string[],
  scenarioMode: ScenarioMode,
): number {
  let score = 0;

  // Dimension match: +3 per matching target dimension
  for (const dim of exercise.targetDimensions) {
    if (targetDimensions.includes(dim)) {
      score += 3;
    }
  }

  // Scenario category preference: +2 if category is preferred
  const preferred = SCENARIO_PREFERRED_CATEGORIES[scenarioMode];
  if (preferred && preferred.includes(exercise.category)) {
    score += 2;
  }

  // Shorter exercises get a small bonus in constrained modes
  const durationLimit = SCENARIO_DURATION_LIMITS[scenarioMode];
  if (durationLimit && exercise.durationMinutes <= durationLimit) {
    score += 1;
  }

  // Easier exercises get a slight bonus in crisis/newborn (low bandwidth)
  if (
    (scenarioMode === 'crisis' || scenarioMode === 'newborn') &&
    exercise.difficulty === 'easy'
  ) {
    score += 1;
  }

  return score;
}

/**
 * Identify the dimensions most in need of attention,
 * ordered from lowest to highest score.
 */
function prioritizedDimensions(relDims: RelDimScores): string[] {
  const entries = Object.entries(relDims) as [string, number][];
  entries.sort((a, b) => a[1] - b[1]);
  return entries.map(([key]) => key);
}

/**
 * Returns 1-3 recommended exercises based on current scores, recent history,
 * and the active scenario mode.
 *
 * Selection logic:
 * 1. Generate rule-based recommendations for context.
 * 2. Determine target dimensions from lowest-scoring relationship dimensions.
 * 3. Filter exercises: remove recently completed, enforce scenario duration limits.
 * 4. Score remaining exercises and return the top 1-3.
 */
export function getRecommendedExercises(
  pillars: PillarScores,
  relDims: RelDimScores,
  violations: ConstraintViolation[],
  recentExerciseIds: string[],
  scenarioMode: string,
): Exercise[] {
  const mode = scenarioMode as ScenarioMode;

  // Generate recommendations to inform dimension targeting
  const recommendations = generateRecommendations(
    pillars,
    relDims,
    violations,
    recentExerciseIds,
  );

  // Collect target dimensions: from recommendations + lowest-scoring dims
  const recTargets = recommendations.map((r) => r.targetDimension);
  const dimPriority = prioritizedDimensions(relDims);
  const targetDimensions = Array.from(
    new Set([...recTargets, ...dimPriority]),
  );

  // Filter exercises
  const durationLimit = SCENARIO_DURATION_LIMITS[mode];
  const candidates = EXERCISES.filter((ex) => {
    // Exclude recently completed exercises (7-day cooldown)
    if (recentExerciseIds.includes(ex.id)) return false;

    // Enforce scenario duration limit
    if (durationLimit && ex.durationMinutes > durationLimit) return false;

    return true;
  });

  // Score and sort
  const scored = candidates.map((ex) => ({
    exercise: ex,
    score: scoreExercise(ex, targetDimensions, mode),
  }));
  scored.sort((a, b) => b.score - a.score);

  // Return top 1-3, ensuring at least 1 if any candidates exist
  const resultCount = Math.min(MAX_RESULTS, scored.length);
  return scored.slice(0, resultCount).map((s) => s.exercise);
}
