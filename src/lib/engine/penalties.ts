import { PillarScores, RelDimScores, Constraint, ConstraintViolation, PenaltyResult } from './types';

const REDLINE_K = 5;
const IMBALANCE_LAMBDA = 2;

// Compute variance of an array of numbers
export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

// Redline penalties: k * (redline - actual)^2 for each violated redline constraint
export function computeRedlinePenalties(
  scores: Record<string, number>,
  constraints: Constraint[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  for (const c of constraints) {
    if (!c.isActive || c.type !== 'redline') continue;
    const actual = scores[c.dimension];
    if (actual === undefined) continue;

    if (c.minValue !== undefined && actual < c.minValue) {
      const gap = c.minValue - actual;
      const penalty = REDLINE_K * gap * gap;
      violations.push({
        constraintId: c.id,
        constraintName: c.name,
        type: c.type,
        dimension: c.dimension,
        actual,
        threshold: c.minValue,
        severity: gap > 2 ? 'critical' : 'warning',
        penalty: Math.round(penalty * 100) / 100,
      });
    }

    if (c.maxValue !== undefined && actual > c.maxValue) {
      const gap = actual - c.maxValue;
      const penalty = REDLINE_K * gap * gap;
      violations.push({
        constraintId: c.id,
        constraintName: c.name,
        type: c.type,
        dimension: c.dimension,
        actual,
        threshold: c.maxValue,
        severity: gap > 2 ? 'critical' : 'warning',
        penalty: Math.round(penalty * 100) / 100,
      });
    }
  }

  return violations;
}

// Budget penalties: linear penalty for overshoot beyond budgetHours
export function computeBudgetPenalties(
  allocations: Record<string, number>,
  constraints: Constraint[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  for (const c of constraints) {
    if (!c.isActive) continue;
    if (c.type !== 'time_budget' && c.type !== 'energy_budget') continue;
    if (c.budgetHours === undefined) continue;

    const actual = allocations[c.dimension];
    if (actual === undefined) continue;

    if (actual > c.budgetHours) {
      const overshoot = actual - c.budgetHours;
      const penalty = overshoot; // linear penalty: 1 point per unit overshoot
      violations.push({
        constraintId: c.id,
        constraintName: c.name,
        type: c.type,
        dimension: c.dimension,
        actual,
        threshold: c.budgetHours,
        severity: overshoot > 2 ? 'critical' : 'warning',
        penalty: Math.round(penalty * 100) / 100,
      });
    }
  }

  return violations;
}

// Imbalance penalty: lambda * variance(pillar scores)
export function computeImbalancePenalty(pillars: PillarScores): number {
  const values = [pillars.vitality, pillars.growth, pillars.security, pillars.connection];
  const v = variance(values);
  return Math.round(IMBALANCE_LAMBDA * v * 100) / 100;
}

// Combine all penalties into a single PenaltyResult
export function computeAllPenalties(
  pillars: PillarScores,
  relDims: RelDimScores,
  constraints: Constraint[],
  allocations?: Record<string, number>
): PenaltyResult {
  const scores: Record<string, number> = {
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

  const redlineViolations = computeRedlinePenalties(scores, constraints);
  const budgetViolations = allocations
    ? computeBudgetPenalties(allocations, constraints)
    : [];
  const imbalancePenalty = computeImbalancePenalty(pillars);

  const allViolations = [...redlineViolations, ...budgetViolations];
  const violationPenalty = allViolations.reduce((sum, v) => sum + v.penalty, 0);
  const totalPenalty = Math.round((violationPenalty + imbalancePenalty) * 100) / 100;

  return {
    totalPenalty,
    violations: allViolations,
  };
}
