import { describe, it, expect } from 'vitest';
import { generateRecommendations } from '../rules';
import type { PillarScores, RelDimScores, ConstraintViolation } from '@/lib/engine/types';
import type { ParetoRuleInput } from '../rules';

const healthyPillars: PillarScores = {
  vitality: 8,
  growth: 7,
  security: 8,
  connection: 7,
};

// Note: "stress" here is the raw score (0-10). The maintenance rule fires only
// when ALL dim values are > 6. Stress semantics (high = bad) are handled in
// the scoring engine via inversion; rules.ts treats all dims uniformly.
const healthyRelDims: RelDimScores = {
  emotional: 8,
  trust: 7,
  fairness: 7,
  stress: 7, // must also be > 6 to satisfy allDimsAbove check in rule 7
  autonomy: 8,
};

const noViolations: ConstraintViolation[] = [];

describe('generateRecommendations', () => {
  it('returns maintenance recommendations when all dims are healthy', () => {
    const recs = generateRecommendations(healthyPillars, healthyRelDims, noViolations, []);
    expect(Array.isArray(recs)).toBe(true);
    const hasMaintenance = recs.some((r) => r.type === 'maintenance');
    expect(hasMaintenance).toBe(true);
  });

  it('returns an urgent recommendation with priority 10 for a critical violation', () => {
    const violations: ConstraintViolation[] = [
      {
        constraintId: 'c1',
        constraintName: 'Trust Redline',
        type: 'redline',
        dimension: 'trust',
        actual: 1.5,
        threshold: 2,
        severity: 'critical',
        penalty: 10,
      },
    ];
    const recs = generateRecommendations(healthyPillars, healthyRelDims, violations, []);
    const urgent = recs.find((r) => r.priority === 10);
    expect(urgent).toBeDefined();
    expect(urgent!.type).toBe('urgent');
  });

  it('returns an urgent recommendation when trust is below 3', () => {
    const lowTrustDims: RelDimScores = { ...healthyRelDims, trust: 2 };
    const recs = generateRecommendations(healthyPillars, lowTrustDims, noViolations, []);
    const urgentTrust = recs.find(
      (r) => r.type === 'urgent' && r.targetDimension === 'trust',
    );
    expect(urgentTrust).toBeDefined();
    expect(urgentTrust!.priority).toBe(9);
  });

  it('returns a stress improvement recommendation when stress is above 7', () => {
    const highStressDims: RelDimScores = { ...healthyRelDims, stress: 8 };
    const recs = generateRecommendations(healthyPillars, highStressDims, noViolations, []);
    const stressRec = recs.find((r) => r.targetDimension === 'stress');
    expect(stressRec).toBeDefined();
    expect(stressRec!.priority).toBe(5);
  });

  it('includes a priority-8 recommendation when off the Pareto frontier', () => {
    const paretoInput: ParetoRuleInput = {
      isOnFrontier: false,
      nearestFrontierPoint: { lifeScore: 80, relScore: 75 },
      currentLifeScore: 60,
      currentRelScore: 55,
      laggingDimensions: ['emotional', 'trust'],
    };
    const recs = generateRecommendations(
      healthyPillars,
      healthyRelDims,
      noViolations,
      [],
      paretoInput,
    );
    const pareto = recs.find((r) => r.priority === 8);
    expect(pareto).toBeDefined();
    expect(pareto!.type).toBe('improvement');
  });

  it('does NOT include a priority-8 recommendation when on the Pareto frontier', () => {
    const paretoInput: ParetoRuleInput = {
      isOnFrontier: true,
      nearestFrontierPoint: { lifeScore: 80, relScore: 75 },
      currentLifeScore: 80,
      currentRelScore: 75,
      laggingDimensions: [],
    };
    const recs = generateRecommendations(
      healthyPillars,
      healthyRelDims,
      noViolations,
      [],
      paretoInput,
    );
    const pareto = recs.find((r) => r.priority === 8);
    expect(pareto).toBeUndefined();
  });

  it('returns recommendations sorted by priority descending', () => {
    const lowTrustDims: RelDimScores = { ...healthyRelDims, trust: 2, stress: 8 };
    const recs = generateRecommendations(healthyPillars, lowTrustDims, noViolations, []);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].priority).toBeGreaterThanOrEqual(recs[i].priority);
    }
  });

  it('does not throw when the 5th paretoInput parameter is omitted', () => {
    expect(() =>
      generateRecommendations(healthyPillars, healthyRelDims, noViolations, []),
    ).not.toThrow();
  });
});
