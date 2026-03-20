import type { ScenarioProfile } from '../engine/types';

export const SCENARIO_PRESETS: ScenarioProfile[] = [
  // ── 1. Default ─────────────────────────────────────────────
  {
    id: 'scenario-default',
    name: 'Default',
    mode: 'default',
    description:
      'Balanced weights across all pillars and dimensions. Standard constraint thresholds suitable for everyday life.',
    weightOverrides: {
      alpha: 0.5,
      beta: 0.5,
      pillar: {
        vitality: 0.25,
        growth: 0.25,
        security: 0.25,
        connection: 0.25,
      },
      rel: {
        emotional: 0.2,
        trust: 0.2,
        fairness: 0.2,
        stress: 0.2,
        autonomy: 0.2,
      },
    },
    constraintOverrides: [],
  },

  // ── 2. Exam ────────────────────────────────────────────────
  {
    id: 'scenario-exam',
    name: 'Exam Season',
    mode: 'exam',
    description:
      'Growth and autonomy are prioritized. Connection and vitality weights are reduced. Exercises are kept short to respect limited free time.',
    weightOverrides: {
      alpha: 0.65,
      beta: 0.35,
      pillar: {
        vitality: 0.15,
        growth: 0.45,
        security: 0.25,
        connection: 0.15,
      },
      rel: {
        emotional: 0.15,
        trust: 0.2,
        fairness: 0.15,
        stress: 0.3,
        autonomy: 0.2,
      },
    },
    constraintOverrides: [
      {
        id: 'exam-time',
        name: 'Exam time budget',
        type: 'time_budget',
        dimension: 'connection',
        budgetHours: 3,
        isActive: true,
      },
      {
        id: 'exam-energy',
        name: 'Exam energy budget',
        type: 'energy_budget',
        dimension: 'vitality',
        budgetHours: 2,
        isActive: true,
      },
    ],
  },

  // ── 3. Chill ───────────────────────────────────────────────
  {
    id: 'scenario-chill',
    name: 'Chill Mode',
    mode: 'chill',
    description:
      'Vitality and connection are emphasized. Security and growth pressures are relaxed. Constraints are lenient to encourage spontaneity.',
    weightOverrides: {
      alpha: 0.4,
      beta: 0.6,
      pillar: {
        vitality: 0.35,
        growth: 0.1,
        security: 0.15,
        connection: 0.4,
      },
      rel: {
        emotional: 0.25,
        trust: 0.2,
        fairness: 0.15,
        stress: 0.15,
        autonomy: 0.25,
      },
    },
    constraintOverrides: [
      {
        id: 'chill-redline',
        name: 'Relaxed redline',
        type: 'redline',
        dimension: 'growth',
        minValue: 2,
        isActive: true,
      },
    ],
  },

  // ── 4. Newborn ─────────────────────────────────────────────
  {
    id: 'scenario-newborn',
    name: 'Newborn',
    mode: 'newborn',
    description:
      'Security is the top priority, followed by connection. Growth expectations are minimal. Constraints are very relaxed to account for sleep deprivation and disrupted routines.',
    weightOverrides: {
      alpha: 0.55,
      beta: 0.45,
      pillar: {
        vitality: 0.2,
        growth: 0.05,
        security: 0.5,
        connection: 0.25,
      },
      rel: {
        emotional: 0.25,
        trust: 0.2,
        fairness: 0.25,
        stress: 0.2,
        autonomy: 0.1,
      },
    },
    constraintOverrides: [
      {
        id: 'newborn-time',
        name: 'Newborn time budget',
        type: 'time_budget',
        dimension: 'connection',
        budgetHours: 2,
        isActive: true,
      },
      {
        id: 'newborn-growth-redline',
        name: 'Newborn growth redline (lowered)',
        type: 'redline',
        dimension: 'growth',
        minValue: 1,
        isActive: true,
      },
      {
        id: 'newborn-energy',
        name: 'Newborn energy budget',
        type: 'energy_budget',
        dimension: 'vitality',
        budgetHours: 1,
        isActive: true,
      },
    ],
  },

  // ── 5. Crisis ──────────────────────────────────────────────
  {
    id: 'scenario-crisis',
    name: 'Crisis Mode',
    mode: 'crisis',
    description:
      'Emotional well-being is the highest priority. Stress tracking is strict with low thresholds. Frequent check-ins are encouraged. Growth and autonomy take a back seat.',
    weightOverrides: {
      alpha: 0.35,
      beta: 0.65,
      pillar: {
        vitality: 0.25,
        growth: 0.1,
        security: 0.4,
        connection: 0.25,
      },
      rel: {
        emotional: 0.35,
        trust: 0.2,
        fairness: 0.1,
        stress: 0.25,
        autonomy: 0.1,
      },
    },
    constraintOverrides: [
      {
        id: 'crisis-stress-redline',
        name: 'Crisis stress redline',
        type: 'redline',
        dimension: 'stress',
        maxValue: 6,
        isActive: true,
      },
      {
        id: 'crisis-emotional-redline',
        name: 'Crisis emotional redline',
        type: 'redline',
        dimension: 'emotional',
        minValue: 4,
        isActive: true,
      },
    ],
  },

  // ── 6. Long Distance ──────────────────────────────────────
  {
    id: 'scenario-long-distance',
    name: 'Long Distance',
    mode: 'long_distance',
    description:
      'Trust and emotional connection are weighted highest. Fairness is deprioritized (asymmetric daily lives). Autonomy is given more room to prevent codependency across distance.',
    weightOverrides: {
      alpha: 0.45,
      beta: 0.55,
      pillar: {
        vitality: 0.2,
        growth: 0.25,
        security: 0.3,
        connection: 0.25,
      },
      rel: {
        emotional: 0.3,
        trust: 0.3,
        fairness: 0.1,
        stress: 0.05,
        autonomy: 0.25,
      },
    },
    constraintOverrides: [
      {
        id: 'ld-trust-redline',
        name: 'Long distance trust redline',
        type: 'redline',
        dimension: 'trust',
        minValue: 5,
        isActive: true,
      },
      {
        id: 'ld-emotional-redline',
        name: 'Long distance emotional redline',
        type: 'redline',
        dimension: 'emotional',
        minValue: 4,
        isActive: true,
      },
    ],
  },
];
