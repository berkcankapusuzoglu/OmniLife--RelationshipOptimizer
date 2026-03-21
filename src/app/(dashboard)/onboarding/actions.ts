"use server";

import { getDb } from "@/lib/db";
import {
  dailyLogs,
  scores,
  users,
  constraints,
  scenarioProfiles,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { computeAllScores } from "@/lib/engine/scoring";
import { computeAllPenalties } from "@/lib/engine/penalties";
import type {
  PillarScores,
  RelDimScores,
  Weights,
  Constraint,
} from "@/lib/engine/types";
import { v4 as uuid } from "uuid";
import { updateStreak } from "@/lib/streaks";
import { SCENARIO_PRESETS } from "@/lib/scenarios/presets";

export interface OnboardingData {
  // Step 1: Goals / relationship status
  relationshipStatus: string;
  goals: string[];

  // Step 2: Self-assessment (9 dimensions, 1-10 each)
  vitality: number;
  growth: number;
  security: number;
  connection: number;
  emotional: number;
  trust: number;
  fairness: number;
  stress: number;
  autonomy: number;

  // Step 3: Scenario selection
  scenarioMode: string;

  // Step 4: Constraints (optional)
  constraints: Array<{
    name: string;
    type: "time_budget" | "energy_budget" | "redline";
    dimension: string;
    minValue?: number;
    maxValue?: number;
    budgetHours?: number;
  }>;

  // Step 5: Partner invite (optional)
  partnerEmail?: string;
}

export async function completeOnboarding(
  userId: string,
  data: OnboardingData
) {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  // 1. Create first daily log from self-assessment
  const logId = uuid();
  await db.insert(dailyLogs).values({
    id: logId,
    userId,
    date: today,
    vitalityScore: data.vitality,
    growthScore: data.growth,
    securityScore: data.security,
    connectionScore: data.connection,
    emotionalScore: data.emotional,
    trustScore: data.trust,
    fairnessScore: data.fairness,
    stressScore: data.stress,
    autonomyScore: data.autonomy,
    mood: 5,
    energyLevel: 5,
    notes: "Initial assessment from onboarding",
    scenarioMode: data.scenarioMode,
  });

  // 2. Set scenario profile if selected
  const selectedPreset = SCENARIO_PRESETS.find(
    (p) => p.mode === data.scenarioMode
  );

  let scenarioId: string | undefined;
  if (selectedPreset) {
    scenarioId = uuid();
    await db.insert(scenarioProfiles).values({
      id: scenarioId,
      userId,
      name: selectedPreset.name,
      mode: selectedPreset.mode as "default" | "exam" | "chill" | "newborn" | "crisis" | "long_distance" | "custom",
      description: selectedPreset.description,
      weightOverrides: selectedPreset.weightOverrides,
      constraintOverrides: selectedPreset.constraintOverrides,
      isPreset: true,
    });
  }

  // 3. Determine weights (use scenario overrides if available, else defaults)
  const weights: Weights = selectedPreset?.weightOverrides
    ? {
        alpha: selectedPreset.weightOverrides.alpha ?? 0.5,
        beta: selectedPreset.weightOverrides.beta ?? 0.5,
        pillar: {
          vitality: selectedPreset.weightOverrides.pillar?.vitality ?? 0.25,
          growth: selectedPreset.weightOverrides.pillar?.growth ?? 0.25,
          security: selectedPreset.weightOverrides.pillar?.security ?? 0.25,
          connection: selectedPreset.weightOverrides.pillar?.connection ?? 0.25,
        },
        rel: {
          emotional: selectedPreset.weightOverrides.rel?.emotional ?? 0.2,
          trust: selectedPreset.weightOverrides.rel?.trust ?? 0.2,
          fairness: selectedPreset.weightOverrides.rel?.fairness ?? 0.2,
          stress: selectedPreset.weightOverrides.rel?.stress ?? 0.2,
          autonomy: selectedPreset.weightOverrides.rel?.autonomy ?? 0.2,
        },
      }
    : {
        alpha: 0.5,
        beta: 0.5,
        pillar: { vitality: 0.25, growth: 0.25, security: 0.25, connection: 0.25 },
        rel: { emotional: 0.2, trust: 0.2, fairness: 0.2, stress: 0.2, autonomy: 0.2 },
      };

  // 4. Compute scores
  const pillars: PillarScores = {
    vitality: data.vitality,
    growth: data.growth,
    security: data.security,
    connection: data.connection,
  };
  const relDims: RelDimScores = {
    emotional: data.emotional,
    trust: data.trust,
    fairness: data.fairness,
    stress: data.stress,
    autonomy: data.autonomy,
  };

  // Fetch constraints created below + scenario constraint overrides
  const allConstraints: Constraint[] = [];

  // 5. Create user constraints from onboarding
  for (const c of data.constraints) {
    const constraintId = uuid();
    await db.insert(constraints).values({
      id: constraintId,
      userId,
      name: c.name,
      type: c.type,
      dimension: c.dimension,
      minValue: c.minValue?.toString(),
      maxValue: c.maxValue?.toString(),
      budgetHours: c.budgetHours?.toString(),
      isActive: true,
    });
    allConstraints.push({
      id: constraintId,
      name: c.name,
      type: c.type,
      dimension: c.dimension,
      minValue: c.minValue,
      maxValue: c.maxValue,
      budgetHours: c.budgetHours,
      isActive: true,
    });
  }

  const penalty = computeAllPenalties(pillars, relDims, allConstraints);
  const computed = computeAllScores(pillars, relDims, weights, penalty.totalPenalty);

  await db.insert(scores).values({
    id: uuid(),
    dailyLogId: logId,
    userId,
    date: today,
    lifeScore: computed.lifeScore.toString(),
    relScore: computed.relScore.toString(),
    totalQuality: computed.totalQuality.toString(),
    penaltyApplied: penalty.totalPenalty.toString(),
    constraintViolations: penalty.violations,
    weightsSnapshot: weights,
  });

  // 6. Update streak
  await updateStreak(userId, today);

  // 7. Update user: mark onboarding complete, set scenario + weights
  const userUpdate: Record<string, unknown> = {
    onboardingCompleted: true,
  };

  if (scenarioId) {
    userUpdate.activeScenarioId = scenarioId;
  }

  // Apply scenario weights to user
  userUpdate.alphaWeight = weights.alpha.toString();
  userUpdate.betaWeight = weights.beta.toString();
  userUpdate.pillarVitalityWeight = weights.pillar.vitality.toString();
  userUpdate.pillarGrowthWeight = weights.pillar.growth.toString();
  userUpdate.pillarSecurityWeight = weights.pillar.security.toString();
  userUpdate.pillarConnectionWeight = weights.pillar.connection.toString();
  userUpdate.relEmotionalWeight = weights.rel.emotional.toString();
  userUpdate.relTrustWeight = weights.rel.trust.toString();
  userUpdate.relFairnessWeight = weights.rel.fairness.toString();
  userUpdate.relStressWeight = weights.rel.stress.toString();
  userUpdate.relAutonomyWeight = weights.rel.autonomy.toString();

  await db.update(users).set(userUpdate).where(eq(users.id, userId));

  revalidatePath("/", "layout");
  redirect("/overview");
}
