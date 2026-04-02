import { describe, it, expect } from 'vitest'
import { findParetoFrontier, getPositionRelativeToFrontier } from '../pareto'

// ------------------------------------------------------------------
// findParetoFrontier
// ------------------------------------------------------------------

describe('findParetoFrontier', () => {
  it('empty input → empty frontier', () => {
    expect(findParetoFrontier([])).toEqual([])
  })

  it('single point → returns that point', () => {
    const points = [{ lifeScore: 70, relScore: 60, date: '2024-01-01' }]
    const frontier = findParetoFrontier(points)
    expect(frontier).toHaveLength(1)
    expect(frontier[0].lifeScore).toBe(70)
    expect(frontier[0].relScore).toBe(60)
  })

  it('A dominates B → only A is on frontier', () => {
    // A is better in lifeScore AND relScore
    const A = { lifeScore: 80, relScore: 75, date: '2024-01-01' }
    const B = { lifeScore: 60, relScore: 55, date: '2024-01-02' }
    const frontier = findParetoFrontier([A, B])
    expect(frontier).toHaveLength(1)
    expect(frontier[0].lifeScore).toBe(80)
  })

  it('A and B are incomparable → both on frontier', () => {
    // A has higher lifeScore, B has higher relScore
    const A = { lifeScore: 90, relScore: 50, date: '2024-01-01' }
    const B = { lifeScore: 50, relScore: 90, date: '2024-01-02' }
    const frontier = findParetoFrontier([A, B])
    expect(frontier).toHaveLength(2)
  })

  it('multiple points with mixed dominance — only non-dominated survive', () => {
    // A dominates B and C; D is incomparable to A
    const A = { lifeScore: 80, relScore: 70, date: '2024-01-01' }
    const B = { lifeScore: 60, relScore: 50, date: '2024-01-02' } // dominated by A
    const C = { lifeScore: 70, relScore: 60, date: '2024-01-03' } // dominated by A
    const D = { lifeScore: 50, relScore: 90, date: '2024-01-04' } // incomparable to A
    const frontier = findParetoFrontier([A, B, C, D])
    expect(frontier).toHaveLength(2)
    const lifeScores = frontier.map((p) => p.lifeScore)
    expect(lifeScores).toContain(80) // A
    expect(lifeScores).toContain(50) // D
  })

  it('frontier is sorted by lifeScore ascending', () => {
    const points = [
      { lifeScore: 90, relScore: 40, date: '2024-01-01' },
      { lifeScore: 40, relScore: 90, date: '2024-01-02' },
      { lifeScore: 65, relScore: 65, date: '2024-01-03' },
    ]
    const frontier = findParetoFrontier(points)
    for (let i = 1; i < frontier.length; i++) {
      expect(frontier[i].lifeScore).toBeGreaterThanOrEqual(frontier[i - 1].lifeScore)
    }
  })

  it('equal points — neither strictly dominates the other', () => {
    const A = { lifeScore: 70, relScore: 70, date: '2024-01-01' }
    const B = { lifeScore: 70, relScore: 70, date: '2024-01-02' }
    const frontier = findParetoFrontier([A, B])
    // Neither dominates (dominates requires strict > in at least one), both on frontier
    expect(frontier).toHaveLength(2)
  })
})

// ------------------------------------------------------------------
// getPositionRelativeToFrontier
// ------------------------------------------------------------------

describe('getPositionRelativeToFrontier', () => {
  it('empty frontier → isOnFrontier=true, distance=0', () => {
    const result = getPositionRelativeToFrontier({ lifeScore: 50, relScore: 50 }, [])
    expect(result.isOnFrontier).toBe(true)
    expect(result.distance).toBe(0)
  })

  it('point on the frontier → isOnFrontier=true', () => {
    const frontier = [{ lifeScore: 80, relScore: 70 }]
    const result = getPositionRelativeToFrontier({ lifeScore: 80, relScore: 70 }, frontier)
    expect(result.isOnFrontier).toBe(true)
  })

  it('point dominated by frontier → isOnFrontier=false', () => {
    const frontier = [{ lifeScore: 80, relScore: 70 }]
    // current is strictly worse in both
    const result = getPositionRelativeToFrontier({ lifeScore: 60, relScore: 50 }, frontier)
    expect(result.isOnFrontier).toBe(false)
  })

  it('distance calculation — euclidean distance to nearest frontier point', () => {
    const frontier = [{ lifeScore: 80, relScore: 60 }]
    const current = { lifeScore: 77, relScore: 56 }
    // distance = sqrt((80-77)^2 + (60-56)^2) = sqrt(9+16) = 5
    const result = getPositionRelativeToFrontier(current, frontier)
    expect(result.distance).toBeCloseTo(5)
  })

  it('returns nearest frontier point correctly from multiple options', () => {
    const frontier = [
      { lifeScore: 90, relScore: 40 },
      { lifeScore: 50, relScore: 80 },
    ]
    // current is close to first point
    const current = { lifeScore: 88, relScore: 38 }
    const result = getPositionRelativeToFrontier(current, frontier)
    expect(result.nearestPoint.lifeScore).toBe(90)
    expect(result.nearestPoint.relScore).toBe(40)
  })

  it('point that improves on frontier in one dimension is on frontier', () => {
    const frontier = [{ lifeScore: 70, relScore: 70 }]
    // current has same relScore but higher lifeScore — not dominated
    const result = getPositionRelativeToFrontier({ lifeScore: 80, relScore: 70 }, frontier)
    expect(result.isOnFrontier).toBe(true)
  })

  it('distance rounds to 2 decimal places', () => {
    const frontier = [{ lifeScore: 80, relScore: 60 }]
    const current = { lifeScore: 77, relScore: 56 }
    const result = getPositionRelativeToFrontier(current, frontier)
    const decimalPlaces = (result.distance.toString().split('.')[1] || '').length
    expect(decimalPlaces).toBeLessThanOrEqual(2)
  })
})
