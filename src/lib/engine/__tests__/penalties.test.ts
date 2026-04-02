import { describe, it, expect } from 'vitest'
import {
  variance,
  computeRedlinePenalties,
  computeBudgetPenalties,
  computeImbalancePenalty,
  computeAllPenalties,
} from '../penalties'
import type { Constraint, PillarScores, RelDimScores } from '../types'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function makeRedlineConstraint(overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: 'c1',
    name: 'Test Redline',
    type: 'redline',
    dimension: 'vitality',
    isActive: true,
    ...overrides,
  }
}

function makeBudgetConstraint(overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: 'b1',
    name: 'Test Budget',
    type: 'time_budget',
    dimension: 'vitality',
    budgetHours: 8,
    isActive: true,
    ...overrides,
  }
}

// ------------------------------------------------------------------
// variance
// ------------------------------------------------------------------

describe('variance', () => {
  it('returns 0 for empty array', () => {
    expect(variance([])).toBe(0)
  })

  it('returns 0 for identical values', () => {
    expect(variance([5, 5, 5, 5])).toBe(0)
  })

  it('computes correct variance for known values', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9]: mean=5, variance=4
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4)
  })

  it('returns positive value for spread-out values', () => {
    expect(variance([0, 10])).toBeGreaterThan(0)
  })
})

// ------------------------------------------------------------------
// computeRedlinePenalties
// ------------------------------------------------------------------

describe('computeRedlinePenalties', () => {
  it('returns empty array when no constraints', () => {
    const violations = computeRedlinePenalties({ vitality: 5 }, [])
    expect(violations).toHaveLength(0)
  })

  it('returns empty array when constraint is inactive', () => {
    const c = makeRedlineConstraint({ minValue: 4, isActive: false })
    // actual = 3 (would violate), but isActive=false
    const violations = computeRedlinePenalties({ vitality: 3 }, [c])
    expect(violations).toHaveLength(0)
  })

  it('no violation when actual is above minValue', () => {
    const c = makeRedlineConstraint({ minValue: 3 })
    const violations = computeRedlinePenalties({ vitality: 5 }, [c])
    expect(violations).toHaveLength(0)
  })

  it('no violation when actual equals minValue', () => {
    const c = makeRedlineConstraint({ minValue: 5 })
    const violations = computeRedlinePenalties({ vitality: 5 }, [c])
    expect(violations).toHaveLength(0)
  })

  it('violation below minValue — quadratic penalty k*(min-actual)^2', () => {
    const c = makeRedlineConstraint({ minValue: 6 })
    // gap=2, penalty = 5 * 2^2 = 20
    const violations = computeRedlinePenalties({ vitality: 4 }, [c])
    expect(violations).toHaveLength(1)
    expect(violations[0].penalty).toBeCloseTo(20)
  })

  it('quadratic growth: double gap → 4x penalty', () => {
    const c1 = makeRedlineConstraint({ minValue: 6 })
    const c2 = makeRedlineConstraint({ minValue: 8 })
    const v1 = computeRedlinePenalties({ vitality: 4 }, [c1]) // gap=2
    const v2 = computeRedlinePenalties({ vitality: 4 }, [c2]) // gap=4
    // penalty ratio should be 4:1
    expect(v2[0].penalty / v1[0].penalty).toBeCloseTo(4)
  })

  it('violation above maxValue — quadratic penalty', () => {
    const c = makeRedlineConstraint({ maxValue: 4 })
    // actual=7, gap=3, penalty = 5 * 3^2 = 45
    const violations = computeRedlinePenalties({ vitality: 7 }, [c])
    expect(violations).toHaveLength(1)
    expect(violations[0].penalty).toBeCloseTo(45)
  })

  it('severity is critical when gap > 2', () => {
    const c = makeRedlineConstraint({ minValue: 7 })
    const violations = computeRedlinePenalties({ vitality: 3 }, [c]) // gap=4
    expect(violations[0].severity).toBe('critical')
  })

  it('severity is warning when gap <= 2', () => {
    const c = makeRedlineConstraint({ minValue: 5 })
    const violations = computeRedlinePenalties({ vitality: 4 }, [c]) // gap=1
    expect(violations[0].severity).toBe('warning')
  })

  it('ignores dimension missing from scores', () => {
    const c = makeRedlineConstraint({ dimension: 'nonexistent', minValue: 5 })
    const violations = computeRedlinePenalties({ vitality: 3 }, [c])
    expect(violations).toHaveLength(0)
  })

  it('ignores non-redline constraints', () => {
    const c = makeBudgetConstraint({ minValue: 5 } as Partial<Constraint>)
    const violations = computeRedlinePenalties({ vitality: 3 }, [c])
    expect(violations).toHaveLength(0)
  })
})

// ------------------------------------------------------------------
// computeBudgetPenalties
// ------------------------------------------------------------------

describe('computeBudgetPenalties', () => {
  it('returns empty array when no constraints', () => {
    const violations = computeBudgetPenalties({ vitality: 10 }, [])
    expect(violations).toHaveLength(0)
  })

  it('no violation when under budget', () => {
    const c = makeBudgetConstraint({ budgetHours: 8 })
    const violations = computeBudgetPenalties({ vitality: 5 }, [c])
    expect(violations).toHaveLength(0)
  })

  it('no violation when exactly at budget', () => {
    const c = makeBudgetConstraint({ budgetHours: 8 })
    const violations = computeBudgetPenalties({ vitality: 8 }, [c])
    expect(violations).toHaveLength(0)
  })

  it('linear penalty when over budget: overshoot = actual - budgetHours', () => {
    const c = makeBudgetConstraint({ budgetHours: 8 })
    const violations = computeBudgetPenalties({ vitality: 11 }, [c])
    expect(violations).toHaveLength(1)
    expect(violations[0].penalty).toBeCloseTo(3) // 11 - 8 = 3
  })

  it('penalty is linear (not quadratic)', () => {
    const c = makeBudgetConstraint({ budgetHours: 5 })
    const v1 = computeBudgetPenalties({ vitality: 6 }, [c]) // overshoot=1
    const v2 = computeBudgetPenalties({ vitality: 7 }, [c]) // overshoot=2
    // linear: ratio should be ~2x, not 4x
    expect(v2[0].penalty / v1[0].penalty).toBeCloseTo(2)
  })

  it('returns empty when constraint is inactive', () => {
    const c = makeBudgetConstraint({ budgetHours: 5, isActive: false })
    const violations = computeBudgetPenalties({ vitality: 10 }, [c])
    expect(violations).toHaveLength(0)
  })

  it('severity is critical when overshoot > 2', () => {
    const c = makeBudgetConstraint({ budgetHours: 5 })
    const violations = computeBudgetPenalties({ vitality: 10 }, [c]) // overshoot=5
    expect(violations[0].severity).toBe('critical')
  })

  it('energy_budget type also produces violation', () => {
    const c = makeBudgetConstraint({ type: 'energy_budget', budgetHours: 5 })
    const violations = computeBudgetPenalties({ vitality: 9 }, [c])
    expect(violations).toHaveLength(1)
  })

  it('ignores dimension missing from allocations', () => {
    const c = makeBudgetConstraint({ dimension: 'missing', budgetHours: 5 })
    const violations = computeBudgetPenalties({ vitality: 10 }, [c])
    expect(violations).toHaveLength(0)
  })
})

// ------------------------------------------------------------------
// computeImbalancePenalty
// ------------------------------------------------------------------

describe('computeImbalancePenalty', () => {
  it('equal pillars → zero penalty', () => {
    const pillars: PillarScores = { vitality: 5, growth: 5, security: 5, connection: 5 }
    expect(computeImbalancePenalty(pillars)).toBe(0)
  })

  it('extreme imbalance → high penalty', () => {
    const pillars: PillarScores = { vitality: 10, growth: 0, security: 0, connection: 0 }
    const penalty = computeImbalancePenalty(pillars)
    expect(penalty).toBeGreaterThan(10)
  })

  it('more balanced → lower penalty than extreme imbalance', () => {
    const balanced: PillarScores = { vitality: 7, growth: 6, security: 6, connection: 7 }
    const imbalanced: PillarScores = { vitality: 10, growth: 0, security: 0, connection: 0 }
    expect(computeImbalancePenalty(balanced)).toBeLessThan(computeImbalancePenalty(imbalanced))
  })

  it('penalty = lambda * variance = 2 * variance', () => {
    const pillars: PillarScores = { vitality: 8, growth: 4, security: 6, connection: 6 }
    const vals = [8, 4, 6, 6]
    const mean = vals.reduce((a, b) => a + b, 0) / 4
    const v = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / 4
    const expected = Math.round(2 * v * 100) / 100
    expect(computeImbalancePenalty(pillars)).toBeCloseTo(expected)
  })
})

// ------------------------------------------------------------------
// computeAllPenalties
// ------------------------------------------------------------------

describe('computeAllPenalties', () => {
  const defaultPillars: PillarScores = { vitality: 5, growth: 5, security: 5, connection: 5 }
  const defaultRelDims: RelDimScores = { emotional: 5, trust: 5, fairness: 5, stress: 5, autonomy: 5 }

  it('no constraints, equal pillars → only imbalance penalty (0)', () => {
    const result = computeAllPenalties(defaultPillars, defaultRelDims, [])
    expect(result.violations).toHaveLength(0)
    expect(result.totalPenalty).toBe(0)
  })

  it('combines redline and budget violations', () => {
    const redline = makeRedlineConstraint({ minValue: 8 }) // vitality=5 → gap=3
    const budget = makeBudgetConstraint({ dimension: 'growth', budgetHours: 3 })
    const allocations = { growth: 6 } // overshoot=3
    const result = computeAllPenalties(defaultPillars, defaultRelDims, [redline, budget], allocations)
    expect(result.violations.length).toBeGreaterThanOrEqual(2)
    expect(result.totalPenalty).toBeGreaterThan(0)
  })

  it('imbalance penalty is included in totalPenalty even without violations', () => {
    const imbalancedPillars: PillarScores = { vitality: 10, growth: 0, security: 0, connection: 0 }
    const result = computeAllPenalties(imbalancedPillars, defaultRelDims, [])
    expect(result.violations).toHaveLength(0)
    expect(result.totalPenalty).toBeGreaterThan(0)
  })

  it('returns PenaltyResult shape with violations array and totalPenalty', () => {
    const result = computeAllPenalties(defaultPillars, defaultRelDims, [])
    expect(result).toHaveProperty('totalPenalty')
    expect(result).toHaveProperty('violations')
    expect(Array.isArray(result.violations)).toBe(true)
  })

  it('totalPenalty includes sum of all violation penalties plus imbalance', () => {
    const redline = makeRedlineConstraint({ minValue: 7 }) // gap=2, penalty=20
    const imbalancedPillars: PillarScores = { vitality: 5, growth: 5, security: 5, connection: 5 }
    const result = computeAllPenalties(imbalancedPillars, defaultRelDims, [redline])
    const violationSum = result.violations.reduce((s, v) => s + v.penalty, 0)
    // totalPenalty = violationSum + imbalancePenalty (0 for equal pillars)
    expect(result.totalPenalty).toBeCloseTo(violationSum)
  })
})
