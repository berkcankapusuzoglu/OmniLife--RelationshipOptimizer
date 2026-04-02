import { describe, it, expect } from 'vitest'
import {
  normalizeWeights,
  computeLifeScore,
  computeRelScore,
  computeTotalQuality,
  computeAllScores,
} from '../scoring'
import type { PillarScores, RelDimScores, PillarWeights, RelWeights, Weights } from '../types'

const equalPillarWeights: PillarWeights = {
  vitality: 0.25,
  growth: 0.25,
  security: 0.25,
  connection: 0.25,
}

const equalRelWeights: RelWeights = {
  emotional: 0.2,
  trust: 0.2,
  fairness: 0.2,
  stress: 0.2,
  autonomy: 0.2,
}

const defaultWeights: Weights = {
  alpha: 0.5,
  beta: 0.5,
  pillar: equalPillarWeights,
  rel: equalRelWeights,
}

describe('normalizeWeights', () => {
  it('returns weights summing to 1 when they already do', () => {
    const w = { a: 0.25, b: 0.25, c: 0.25, d: 0.25 }
    const n = normalizeWeights(w)
    const sum = Object.values(n).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('normalizes weights that do not sum to 1', () => {
    const w = { a: 1, b: 1, c: 1, d: 1 }
    const n = normalizeWeights(w)
    expect(n.a).toBeCloseTo(0.25)
    const sum = Object.values(n).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('normalizes unequal weights correctly', () => {
    const w = { a: 2, b: 1, c: 1 }
    const n = normalizeWeights(w)
    expect(n.a).toBeCloseTo(0.5)
    expect(n.b).toBeCloseTo(0.25)
    expect(n.c).toBeCloseTo(0.25)
  })

  it('returns original weights unchanged when sum is 0', () => {
    const w = { a: 0, b: 0 }
    const n = normalizeWeights(w)
    expect(n.a).toBe(0)
    expect(n.b).toBe(0)
  })
})

describe('computeLifeScore', () => {
  it('with equal weights returns average of pillars × 10', () => {
    const pillars: PillarScores = { vitality: 6, growth: 8, security: 4, connection: 6 }
    // avg = (6+8+4+6)/4 = 6, score = 60
    expect(computeLifeScore(pillars, equalPillarWeights)).toBeCloseTo(60)
  })

  it('all zeros → score 0', () => {
    const pillars: PillarScores = { vitality: 0, growth: 0, security: 0, connection: 0 }
    expect(computeLifeScore(pillars, equalPillarWeights)).toBe(0)
  })

  it('all tens → score 100', () => {
    const pillars: PillarScores = { vitality: 10, growth: 10, security: 10, connection: 10 }
    expect(computeLifeScore(pillars, equalPillarWeights)).toBeCloseTo(100)
  })

  it('emphasizes correct pillar with unequal weights', () => {
    // Heavy weight on vitality
    const pillars: PillarScores = { vitality: 10, growth: 0, security: 0, connection: 0 }
    const heavyVitality: PillarWeights = { vitality: 0.7, growth: 0.1, security: 0.1, connection: 0.1 }
    const score = computeLifeScore(pillars, heavyVitality)
    // Normalized: vitality=0.7, score = 0.7 * 10 * 10 = 70
    expect(score).toBeCloseTo(70)
  })

  it('weights normalize correctly even if they do not sum to 1', () => {
    const pillars: PillarScores = { vitality: 10, growth: 10, security: 10, connection: 10 }
    // Sum=2 instead of 1 — should still produce 100
    const doubledWeights: PillarWeights = { vitality: 0.5, growth: 0.5, security: 0.5, connection: 0.5 }
    expect(computeLifeScore(pillars, doubledWeights)).toBeCloseTo(100)
  })

  it('returns a value between 0 and 100 for typical inputs', () => {
    const pillars: PillarScores = { vitality: 7, growth: 5, security: 6, connection: 8 }
    const score = computeLifeScore(pillars, equalPillarWeights)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('computeRelScore', () => {
  it('with equal weights returns correct weighted average', () => {
    // stress is inverted: (10 - stress)
    const dims: RelDimScores = { emotional: 6, trust: 8, fairness: 4, stress: 2, autonomy: 6 }
    // inverted stress = 8, avg = (6+8+4+8+6)/5 = 6.4, score = 64
    expect(computeRelScore(dims, equalRelWeights)).toBeCloseTo(64)
  })

  it('inverts stress correctly — high stress lowers rel score', () => {
    const lowStress: RelDimScores = { emotional: 5, trust: 5, fairness: 5, stress: 1, autonomy: 5 }
    const highStress: RelDimScores = { emotional: 5, trust: 5, fairness: 5, stress: 9, autonomy: 5 }
    const lowScore = computeRelScore(lowStress, equalRelWeights)
    const highScore = computeRelScore(highStress, equalRelWeights)
    expect(lowScore).toBeGreaterThan(highScore)
  })

  it('all zeros (except stress=0 means no stress) → expected computation', () => {
    const dims: RelDimScores = { emotional: 0, trust: 0, fairness: 0, stress: 0, autonomy: 0 }
    // stress inverted: 10 - 0 = 10, others 0 → avg = 10/5=2, score=20
    // Wait: all dimensions 0, stress contribution = 0.2 * (10-0) * 10 = 20
    const score = computeRelScore(dims, equalRelWeights)
    expect(score).toBeCloseTo(20)
  })

  it('all tens → stress inverted to 0, rest at 10', () => {
    const dims: RelDimScores = { emotional: 10, trust: 10, fairness: 10, stress: 10, autonomy: 10 }
    // stress=10 → inverted to 0; others=10 → 0.8*10 + 0.2*0 = 8 → 8*10=80
    const score = computeRelScore(dims, equalRelWeights)
    expect(score).toBeCloseTo(80)
  })

  it('stress=0, all others 10 → score 100', () => {
    const dims: RelDimScores = { emotional: 10, trust: 10, fairness: 10, stress: 0, autonomy: 10 }
    expect(computeRelScore(dims, equalRelWeights)).toBeCloseTo(100)
  })
})

describe('computeTotalQuality', () => {
  it('equal alpha/beta → average of lifeScore and relScore minus penalty', () => {
    const tq = computeTotalQuality(60, 80, 0.5, 0.5, 0)
    expect(tq).toBeCloseTo(70)
  })

  it('penalty reduces total quality', () => {
    const withoutPenalty = computeTotalQuality(70, 70, 0.5, 0.5, 0)
    const withPenalty = computeTotalQuality(70, 70, 0.5, 0.5, 10)
    expect(withPenalty).toBeLessThan(withoutPenalty)
  })

  it('clamps at 0 when penalties exceed score', () => {
    const tq = computeTotalQuality(10, 10, 0.5, 0.5, 1000)
    expect(tq).toBe(0)
  })

  it('clamps at 100 maximum', () => {
    // Even if arithmetic would exceed 100, it's clamped
    const tq = computeTotalQuality(100, 100, 0.5, 0.5, 0)
    expect(tq).toBe(100)
  })

  it('alpha/beta weights normalize — unequal weights shift result toward heavier score', () => {
    // Heavy alpha (life score)
    const tq = computeTotalQuality(100, 0, 0.9, 0.1, 0)
    expect(tq).toBeGreaterThan(50)
  })
})

describe('computeAllScores', () => {
  it('returns lifeScore, relScore, and totalQuality', () => {
    const pillars: PillarScores = { vitality: 7, growth: 7, security: 7, connection: 7 }
    const relDims: RelDimScores = { emotional: 7, trust: 7, fairness: 7, stress: 3, autonomy: 7 }
    const result = computeAllScores(pillars, relDims, defaultWeights, 0)
    expect(result).toHaveProperty('lifeScore')
    expect(result).toHaveProperty('relScore')
    expect(result).toHaveProperty('totalQuality')
  })

  it('all max inputs with zero penalty → high scores', () => {
    const pillars: PillarScores = { vitality: 10, growth: 10, security: 10, connection: 10 }
    const relDims: RelDimScores = { emotional: 10, trust: 10, fairness: 10, stress: 0, autonomy: 10 }
    const result = computeAllScores(pillars, relDims, defaultWeights, 0)
    expect(result.lifeScore).toBeCloseTo(100)
    expect(result.relScore).toBeCloseTo(100)
    expect(result.totalQuality).toBeCloseTo(100)
  })
})
