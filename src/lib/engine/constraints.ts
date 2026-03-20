import { Constraint, ConstraintViolation } from './types';

// Determine severity based on how far actual is below threshold
export function getSeverity(actual: number, threshold: number): 'warning' | 'critical' {
  return (threshold - actual) > 2 ? 'critical' : 'warning';
}

// Check all constraints against current scores and return violations
export function checkConstraints(
  scores: Record<string, number>,
  constraints: Constraint[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  for (const c of constraints) {
    if (!c.isActive) continue;

    const actual = scores[c.dimension];
    if (actual === undefined) continue;

    if (c.type === 'redline') {
      if (c.minValue !== undefined && actual < c.minValue) {
        violations.push({
          constraintId: c.id,
          constraintName: c.name,
          type: c.type,
          dimension: c.dimension,
          actual,
          threshold: c.minValue,
          severity: getSeverity(actual, c.minValue),
          penalty: 0, // penalty computed separately in penalties.ts
        });
      }

      if (c.maxValue !== undefined && actual > c.maxValue) {
        violations.push({
          constraintId: c.id,
          constraintName: c.name,
          type: c.type,
          dimension: c.dimension,
          actual,
          threshold: c.maxValue,
          severity: (actual - c.maxValue) > 2 ? 'critical' : 'warning',
          penalty: 0,
        });
      }
    }

    if (c.type === 'time_budget' || c.type === 'energy_budget') {
      if (c.budgetHours !== undefined && actual > c.budgetHours) {
        const overshoot = actual - c.budgetHours;
        violations.push({
          constraintId: c.id,
          constraintName: c.name,
          type: c.type,
          dimension: c.dimension,
          actual,
          threshold: c.budgetHours,
          severity: overshoot > 2 ? 'critical' : 'warning',
          penalty: 0,
        });
      }
    }
  }

  return violations;
}
