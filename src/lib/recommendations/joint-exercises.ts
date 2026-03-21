import type { Exercise, RelDimScores } from "../engine/types";
import { EXERCISES } from "./exercises";

/**
 * Find the overlapping weak dimensions between two partners
 * and return joint exercises that target those dimensions.
 */
export function getJointExercises(
  relDimsA: RelDimScores,
  relDimsB: RelDimScores,
  excludeIds: string[] = [],
  maxResults = 5,
): Exercise[] {
  const dimensions: (keyof RelDimScores)[] = [
    "emotional",
    "trust",
    "fairness",
    "stress",
    "autonomy",
  ];

  // For each dimension, compute the average of both partners' scores.
  // Lower average = higher priority to address jointly.
  const dimPriorities = dimensions
    .map((dim) => ({
      dim,
      avgScore: (relDimsA[dim] + relDimsB[dim]) / 2,
    }))
    .sort((a, b) => a.avgScore - b.avgScore);

  // Take the weakest overlapping dimensions (avgScore < 7)
  const weakDims = dimPriorities
    .filter((d) => d.avgScore < 7)
    .map((d) => d.dim);

  // If no weak dims, still use the lowest-scoring ones
  const targetDims = weakDims.length > 0
    ? weakDims
    : dimPriorities.slice(0, 2).map((d) => d.dim);

  // Filter to joint exercises targeting those dimensions
  const jointExercises = EXERCISES.filter(
    (ex) =>
      ex.isJoint === true &&
      !excludeIds.includes(ex.id) &&
      ex.targetDimensions.some((td) => targetDims.includes(td as keyof RelDimScores)),
  );

  // Score exercises: more overlapping target dimensions = higher priority
  const scored = jointExercises.map((ex) => {
    const overlapCount = ex.targetDimensions.filter((td) =>
      targetDims.includes(td as keyof RelDimScores),
    ).length;
    return { exercise: ex, overlapCount };
  });

  scored.sort((a, b) => b.overlapCount - a.overlapCount);

  return scored.slice(0, maxResults).map((s) => s.exercise);
}
