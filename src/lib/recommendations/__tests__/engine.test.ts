import { describe, it, expect } from 'vitest';
import { getRecommendedExercises } from '../engine';
import type { PillarScores, RelDimScores } from '@/lib/engine/types';

const pillars: PillarScores = {
  vitality: 7,
  growth: 6,
  security: 7,
  connection: 6,
};

const relDims: RelDimScores = {
  emotional: 6,
  trust: 6,
  fairness: 6,
  stress: 4,
  autonomy: 6,
};

describe('getRecommendedExercises', () => {
  it('returns an array with minimal valid input', () => {
    const result = getRecommendedExercises(pillars, relDims, [], [], 'default');
    expect(Array.isArray(result)).toBe(true);
  });

  it('does not throw with minimal valid input', () => {
    expect(() =>
      getRecommendedExercises(pillars, relDims, [], [], 'default'),
    ).not.toThrow();
  });

  it('returns at most 3 exercises', () => {
    const result = getRecommendedExercises(pillars, relDims, [], [], 'default');
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('crisis mode enforces the 15-minute duration limit', () => {
    const result = getRecommendedExercises(pillars, relDims, [], [], 'crisis');
    for (const ex of result) {
      expect(ex.durationMinutes).toBeLessThanOrEqual(15);
    }
  });

  it('excludes recently completed exercises', () => {
    // Run once to find what exercises exist
    const allResults = getRecommendedExercises(pillars, relDims, [], [], 'default');
    if (allResults.length === 0) return; // no exercises to test against

    const firstId = allResults[0].id;
    const filtered = getRecommendedExercises(pillars, relDims, [], [firstId], 'default');
    const ids = filtered.map((ex) => ex.id);
    expect(ids).not.toContain(firstId);
  });
});
