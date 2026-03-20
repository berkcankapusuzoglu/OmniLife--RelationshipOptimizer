import { PillarScores, RelDimScores, Weights, Constraint } from './types';
import { computeAllScores } from './scoring';
import { computeAllPenalties } from './penalties';

interface NelderMeadOptions {
  maxIterations?: number;
  tolerance?: number;
}

interface NelderMeadResult {
  solution: number[];
  value: number;
}

// Pure Nelder-Mead simplex optimizer
export function nelderMead(
  objectiveFn: (x: number[]) => number,
  initialGuess: number[],
  options?: NelderMeadOptions
): NelderMeadResult {
  const maxIterations = options?.maxIterations ?? 1000;
  const tolerance = options?.tolerance ?? 1e-8;
  const n = initialGuess.length;

  // Simplex coefficients
  const ALPHA = 1.0;   // reflection
  const GAMMA = 2.0;   // expansion
  const RHO = 0.5;     // contraction
  const SIGMA = 0.5;   // shrink

  // Initialize simplex: n+1 vertices
  const simplex: { point: number[]; value: number }[] = [];

  // First vertex is the initial guess
  simplex.push({ point: [...initialGuess], value: objectiveFn(initialGuess) });

  // Remaining vertices: perturb each dimension
  for (let i = 0; i < n; i++) {
    const point = [...initialGuess];
    point[i] += point[i] !== 0 ? 0.05 * point[i] : 0.00025;
    simplex.push({ point, value: objectiveFn(point) });
  }

  const centroid = (exclude: number): number[] => {
    const c = new Array(n).fill(0);
    for (let i = 0; i <= n; i++) {
      if (i === exclude) continue;
      for (let j = 0; j < n; j++) {
        c[j] += simplex[i].point[j];
      }
    }
    for (let j = 0; j < n; j++) {
      c[j] /= n;
    }
    return c;
  };

  const addVectors = (a: number[], b: number[], scale: number): number[] =>
    a.map((v, i) => v + scale * (b[i] ?? 0));

  const subtractVectors = (a: number[], b: number[]): number[] =>
    a.map((v, i) => v - (b[i] ?? 0));

  for (let iter = 0; iter < maxIterations; iter++) {
    // Sort simplex by objective value (ascending = minimization)
    simplex.sort((a, b) => a.value - b.value);

    // Check convergence: spread of values
    const spread = Math.abs(simplex[n].value - simplex[0].value);
    if (spread < tolerance) break;

    const worst = n;
    const secondWorst = n - 1;
    const best = 0;

    const c = centroid(worst);

    // Reflection
    const reflected = addVectors(c, subtractVectors(c, simplex[worst].point), ALPHA);
    const reflectedValue = objectiveFn(reflected);

    if (reflectedValue >= simplex[best].value && reflectedValue < simplex[secondWorst].value) {
      simplex[worst] = { point: reflected, value: reflectedValue };
      continue;
    }

    // Expansion
    if (reflectedValue < simplex[best].value) {
      const expanded = addVectors(c, subtractVectors(reflected, c), GAMMA);
      const expandedValue = objectiveFn(expanded);
      if (expandedValue < reflectedValue) {
        simplex[worst] = { point: expanded, value: expandedValue };
      } else {
        simplex[worst] = { point: reflected, value: reflectedValue };
      }
      continue;
    }

    // Contraction
    const contracted = addVectors(c, subtractVectors(simplex[worst].point, c), RHO);
    const contractedValue = objectiveFn(contracted);

    if (contractedValue < simplex[worst].value) {
      simplex[worst] = { point: contracted, value: contractedValue };
      continue;
    }

    // Shrink: move all points toward the best
    for (let i = 1; i <= n; i++) {
      const shrunk = addVectors(
        simplex[best].point,
        subtractVectors(simplex[i].point, simplex[best].point),
        SIGMA
      );
      simplex[i] = { point: shrunk, value: objectiveFn(shrunk) };
    }
  }

  simplex.sort((a, b) => a.value - b.value);
  return { solution: simplex[0].point, value: simplex[0].value };
}

// Clamp a value between min and max
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Map a flat array of 9 values back to PillarScores and RelDimScores
function arrayToScores(x: number[]): { pillars: PillarScores; relDims: RelDimScores } {
  return {
    pillars: {
      vitality: clamp(x[0], 0, 10),
      growth: clamp(x[1], 0, 10),
      security: clamp(x[2], 0, 10),
      connection: clamp(x[3], 0, 10),
    },
    relDims: {
      emotional: clamp(x[4], 0, 10),
      trust: clamp(x[5], 0, 10),
      fairness: clamp(x[6], 0, 10),
      stress: clamp(x[7], 0, 10),
      autonomy: clamp(x[8], 0, 10),
    },
  };
}

// Convert PillarScores and RelDimScores to a flat array
function scoresToArray(pillars: PillarScores, relDims: RelDimScores): number[] {
  return [
    pillars.vitality, pillars.growth, pillars.security, pillars.connection,
    relDims.emotional, relDims.trust, relDims.fairness, relDims.stress, relDims.autonomy,
  ];
}

// Optimize allocations using Nelder-Mead to maximize totalQuality
export function optimizeAllocations(
  currentScores: { pillars: PillarScores; relDims: RelDimScores },
  weights: Weights,
  constraints: Constraint[]
): {
  recommendedAllocations: Record<string, number>;
  predictedScores: { lifeScore: number; relScore: number; totalQuality: number };
  tradeoffs: string[];
} {
  const initial = scoresToArray(currentScores.pillars, currentScores.relDims);

  // Objective: minimize negative totalQuality (i.e., maximize totalQuality)
  const objectiveFn = (x: number[]): number => {
    const { pillars, relDims } = arrayToScores(x);
    const penaltyResult = computeAllPenalties(pillars, relDims, constraints);
    const scores = computeAllScores(pillars, relDims, weights, penaltyResult.totalPenalty);
    return -scores.totalQuality; // negate for minimization
  };

  const result = nelderMead(objectiveFn, initial, { maxIterations: 2000, tolerance: 1e-6 });

  const { pillars: optPillars, relDims: optRelDims } = arrayToScores(result.solution);
  const optPenalty = computeAllPenalties(optPillars, optRelDims, constraints);
  const predictedScores = computeAllScores(optPillars, optRelDims, weights, optPenalty.totalPenalty);

  const recommendedAllocations: Record<string, number> = {
    vitality: Math.round(optPillars.vitality * 100) / 100,
    growth: Math.round(optPillars.growth * 100) / 100,
    security: Math.round(optPillars.security * 100) / 100,
    connection: Math.round(optPillars.connection * 100) / 100,
    emotional: Math.round(optRelDims.emotional * 100) / 100,
    trust: Math.round(optRelDims.trust * 100) / 100,
    fairness: Math.round(optRelDims.fairness * 100) / 100,
    stress: Math.round(optRelDims.stress * 100) / 100,
    autonomy: Math.round(optRelDims.autonomy * 100) / 100,
  };

  // Identify tradeoffs: dimensions that decreased from current
  const tradeoffs: string[] = [];
  const dimensionNames = [
    'vitality', 'growth', 'security', 'connection',
    'emotional', 'trust', 'fairness', 'stress', 'autonomy',
  ];
  for (let i = 0; i < dimensionNames.length; i++) {
    const diff = result.solution[i] - initial[i];
    if (diff < -0.5) {
      tradeoffs.push(
        `${dimensionNames[i]} may decrease by ~${Math.abs(Math.round(diff * 10) / 10)} points to improve overall quality`
      );
    }
  }

  return { recommendedAllocations, predictedScores, tradeoffs };
}
