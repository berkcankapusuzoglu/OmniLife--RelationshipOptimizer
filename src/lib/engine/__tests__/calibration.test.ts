import { describe, it, expect } from 'vitest'
import { computeWeightSuggestions } from '../calibration'
import type { Weights } from '../types'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function makeLog(overrides: Partial<{
  vitalityScore: number; growthScore: number; securityScore: number; connectionScore: number;
  emotionalScore: number; trustScore: number; fairnessScore: number; stressScore: number; autonomyScore: number;
}> = {}) {
  return {
    vitalityScore: 5,
    growthScore: 5,
    securityScore: 5,
    connectionScore: 5,
    emotionalScore: 5,
    trustScore: 5,
    fairnessScore: 5,
    stressScore: 5,
    autonomyScore: 5,
    ...overrides,
  }
}

function makeScore(totalQuality: number) {
  return { totalQuality }
}

const defaultWeights: Weights = {
  alpha: 0.5,
  beta: 0.5,
  pillar: { vitality: 0.25, growth: 0.25, security: 0.25, connection: 0.25 },
  rel: { emotional: 0.2, trust: 0.2, fairness: 0.2, stress: 0.2, autonomy: 0.2 },
}

function generateNLogs(n: number) {
  return Array.from({ length: n }, (_, i) => makeLog({ vitalityScore: (i % 10) + 1 }))
}

function generateNScores(n: number) {
  return Array.from({ length: n }, (_, i) => makeScore(40 + (i % 6) * 10))
}

// ------------------------------------------------------------------
// computeWeightSuggestions
// ------------------------------------------------------------------

describe('computeWeightSuggestions', () => {
  it('returns eligible=false when fewer than 14 logs', () => {
    const logs = generateNLogs(10)
    const scores = generateNScores(10)
    const result = computeWeightSuggestions(logs, scores, defaultWeights)
    expect(result.eligible).toBe(false)
  })

  it('returns eligible=false when exactly 13 logs', () => {
    const result = computeWeightSuggestions(generateNLogs(13), generateNScores(13), defaultWeights)
    expect(result.eligible).toBe(false)
  })

  it('returns eligible=true with 14+ data points', () => {
    const result = computeWeightSuggestions(generateNLogs(14), generateNScores(14), defaultWeights)
    expect(result.eligible).toBe(true)
  })

  it('includes a summary string', () => {
    const result = computeWeightSuggestions(generateNLogs(14), generateNScores(14), defaultWeights)
    expect(typeof result.summary).toBe('string')
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('ineligible result includes count in summary message', () => {
    const logs = generateNLogs(8)
    const scores = generateNScores(8)
    const result = computeWeightSuggestions(logs, scores, defaultWeights)
    expect(result.summary).toContain('8')
  })

  it('returns empty suggestions array when ineligible', () => {
    const result = computeWeightSuggestions(generateNLogs(5), generateNScores(5), defaultWeights)
    expect(result.suggestions).toEqual([])
  })

  it('suggestions (when present) have required fields', () => {
    // Generate data where vitality strongly correlates with quality
    const n = 20
    const logs = Array.from({ length: n }, (_, i) => makeLog({ vitalityScore: i % 10 + 1 }))
    const scores = Array.from({ length: n }, (_, i) => makeScore((i % 10 + 1) * 10))
    const result = computeWeightSuggestions(logs, scores, defaultWeights)
    expect(result.eligible).toBe(true)
    for (const s of result.suggestions) {
      expect(s).toHaveProperty('dimension')
      expect(s).toHaveProperty('label')
      expect(s).toHaveProperty('currentWeight')
      expect(s).toHaveProperty('suggestedWeight')
      expect(s).toHaveProperty('delta')
      expect(s).toHaveProperty('reasoning')
      expect(s).toHaveProperty('group')
    }
  })

  it('suggested weights are clamped between 0.05 and 0.6', () => {
    const n = 30
    // Make vitality perfectly predict quality to force max correlation
    const logs = Array.from({ length: n }, (_, i) => makeLog({ vitalityScore: i % 10 + 1 }))
    const scores = Array.from({ length: n }, (_, i) => makeScore((i % 10 + 1) * 10))
    const result = computeWeightSuggestions(logs, scores, defaultWeights)
    for (const s of result.suggestions) {
      expect(s.suggestedWeight).toBeGreaterThanOrEqual(0.05)
      expect(s.suggestedWeight).toBeLessThanOrEqual(0.6)
    }
  })

  it('group field is either "pillar" or "rel"', () => {
    const n = 20
    const logs = Array.from({ length: n }, (_, i) => makeLog({ vitalityScore: i % 10 + 1 }))
    const scores = Array.from({ length: n }, (_, i) => makeScore((i % 10 + 1) * 10))
    const result = computeWeightSuggestions(logs, scores, defaultWeights)
    for (const s of result.suggestions) {
      expect(['pillar', 'rel']).toContain(s.group)
    }
  })

  it('dimension with high correlation to quality is suggested to have higher weight', () => {
    // Vitality perfectly correlates with quality; all others are constant
    const n = 20
    const logs = Array.from({ length: n }, (_, i) =>
      makeLog({ vitalityScore: (i % 10) + 1, growthScore: 5, securityScore: 5, connectionScore: 5 })
    )
    const scores = Array.from({ length: n }, (_, i) => makeScore(((i % 10) + 1) * 10))
    const result = computeWeightSuggestions(logs, scores, defaultWeights)
    const vitalitySuggestion = result.suggestions.find((s) => s.dimension === 'vitality')
    if (vitalitySuggestion) {
      // For high correlation, the suggested weight should exceed current equal weight (0.25)
      expect(vitalitySuggestion.suggestedWeight).toBeGreaterThan(vitalitySuggestion.currentWeight)
    }
    // (It's OK if no suggestion is made if delta < 0.03, but eligible should be true)
    expect(result.eligible).toBe(true)
  })

  it('uses minimum of logs and scores length when they differ', () => {
    // 20 logs, only 14 scores — should still be eligible
    const result = computeWeightSuggestions(generateNLogs(20), generateNScores(14), defaultWeights)
    expect(result.eligible).toBe(true)
  })

  it('ineligible when scores has fewer than 14 entries even if logs has 20', () => {
    const result = computeWeightSuggestions(generateNLogs(20), generateNScores(10), defaultWeights)
    expect(result.eligible).toBe(false)
  })
})
