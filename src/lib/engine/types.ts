export interface PillarScores {
  vitality: number;   // 0-10
  growth: number;     // 0-10
  security: number;   // 0-10
  connection: number; // 0-10
}

export interface RelDimScores {
  emotional: number;  // 0-10
  trust: number;      // 0-10
  fairness: number;   // 0-10
  stress: number;     // 0-10
  autonomy: number;   // 0-10
}

export interface PillarWeights {
  vitality: number;
  growth: number;
  security: number;
  connection: number;
}

export interface RelWeights {
  emotional: number;
  trust: number;
  fairness: number;
  stress: number;
  autonomy: number;
}

export interface Weights {
  alpha: number;  // life weight (0-1)
  beta: number;   // relationship weight (0-1), alpha+beta=1
  pillar: PillarWeights;
  rel: RelWeights;
}

export interface Constraint {
  id: string;
  name: string;
  type: 'time_budget' | 'energy_budget' | 'redline';
  dimension: string;
  minValue?: number;
  maxValue?: number;
  budgetHours?: number;
  isActive: boolean;
}

export interface ConstraintViolation {
  constraintId: string;
  constraintName: string;
  type: string;
  dimension: string;
  actual: number;
  threshold: number;
  severity: 'warning' | 'critical';
  penalty: number;
}

export interface PenaltyResult {
  totalPenalty: number;
  violations: ConstraintViolation[];
}

export interface ScoreResult {
  lifeScore: number;      // 0-100
  relScore: number;       // 0-100
  totalQuality: number;   // 0-100
  penalty: PenaltyResult;
}

export interface ScenarioProfile {
  id: string;
  name: string;
  mode: 'default' | 'exam' | 'chill' | 'newborn' | 'crisis' | 'long_distance' | 'custom';
  description: string;
  weightOverrides: Partial<Weights>;
  constraintOverrides: Partial<Constraint>[];
}

export interface Recommendation {
  id: string;
  type: 'urgent' | 'improvement' | 'maintenance' | 'exploration';
  title: string;
  description: string;
  theoryBasis: string;
  targetDimension: string;
  priority: number; // 1-10, higher = more urgent
  actionSteps?: string[];
  resourceLinks?: { label: string; url: string }[];
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  category: 'emotional' | 'trust' | 'fairness' | 'communication' | 'intimacy' | 'growth' | 'stress' | 'autonomy';
  durationMinutes: number;
  targetDimensions: string[];
  theoryBasis: string;
  instructions: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  isJoint?: boolean;
}

export interface TheoryReference {
  name: string;
  shortExplanation: string;
  actionableInsight: string;
  sourceReference: string;
}

export interface OptimizerResult {
  recommendedAllocations: Record<string, number>;
  predictedScores: { lifeScore: number; relScore: number; totalQuality: number };
  tradeoffs: string[];
  currentTotalQuality: number;
  gainFromOptimization: number;
}

export interface ParetoAnalysis {
  isOnFrontier: boolean;
  distanceFromFrontier: number;
  nearestFrontierPoint: { lifeScore: number; relScore: number } | null;
  lifeScoreGap: number;
  relScoreGap: number;
  laggingDimensions: string[];
}
