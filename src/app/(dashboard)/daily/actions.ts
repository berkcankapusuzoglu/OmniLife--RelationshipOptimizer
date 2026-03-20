"use server";

import { getDb } from "@/lib/db";
import { dailyLogs, scores, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { computeAllScores } from "@/lib/engine/scoring";
import { computeAllPenalties } from "@/lib/engine/penalties";
import type { PillarScores, RelDimScores, Weights } from "@/lib/engine/types";
import { v4 as uuid } from "uuid";

export async function submitDailyLog(data: {
  userId: string;
  vitality: number;
  growth: number;
  security: number;
  connection: number;
  emotional: number;
  trust: number;
  fairness: number;
  stress: number;
  autonomy: number;
  mood: number;
  energyLevel: number;
  notes: string;
}) {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  const logId = uuid();
  await db.insert(dailyLogs).values({
    id: logId,
    userId: data.userId,
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
    mood: data.mood,
    energyLevel: data.energyLevel,
    notes: data.notes,
  });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, data.userId))
    .limit(1);

  if (!user) return;

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

  const weights: Weights = {
    alpha: Number(user.alphaWeight),
    beta: Number(user.betaWeight),
    pillar: {
      vitality: Number(user.pillarVitalityWeight),
      growth: Number(user.pillarGrowthWeight),
      security: Number(user.pillarSecurityWeight),
      connection: Number(user.pillarConnectionWeight),
    },
    rel: {
      emotional: Number(user.relEmotionalWeight),
      trust: Number(user.relTrustWeight),
      fairness: Number(user.relFairnessWeight),
      stress: Number(user.relStressWeight),
      autonomy: Number(user.relAutonomyWeight),
    },
  };

  const penalty = computeAllPenalties(pillars, relDims, []);
  const computed = computeAllScores(pillars, relDims, weights, penalty.totalPenalty);

  await db.insert(scores).values({
    id: uuid(),
    dailyLogId: logId,
    userId: data.userId,
    date: today,
    lifeScore: computed.lifeScore.toString(),
    relScore: computed.relScore.toString(),
    totalQuality: computed.totalQuality.toString(),
    penaltyApplied: penalty.totalPenalty.toString(),
    constraintViolations: penalty.violations,
    weightsSnapshot: weights,
  });

  revalidatePath("/", "layout");
}
