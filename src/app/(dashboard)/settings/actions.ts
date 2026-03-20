"use server";

import { getDb } from "@/lib/db";
import { users, dailyLogs, scores, weeklyCheckins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { Weights } from "@/lib/engine/types";

export async function updateProfile(formData: FormData) {
  const db = getDb();
  const userId = formData.get("userId") as string;
  const name = formData.get("name") as string;

  await db.update(users).set({ name }).where(eq(users.id, userId));

  revalidatePath("/settings");
}

export async function updateWeights(userId: string, weights: Weights) {
  const db = getDb();

  await db
    .update(users)
    .set({
      alphaWeight: weights.alpha.toString(),
      betaWeight: weights.beta.toString(),
      pillarVitalityWeight: weights.pillar.vitality.toString(),
      pillarGrowthWeight: weights.pillar.growth.toString(),
      pillarSecurityWeight: weights.pillar.security.toString(),
      pillarConnectionWeight: weights.pillar.connection.toString(),
      relEmotionalWeight: weights.rel.emotional.toString(),
      relTrustWeight: weights.rel.trust.toString(),
      relFairnessWeight: weights.rel.fairness.toString(),
      relStressWeight: weights.rel.stress.toString(),
      relAutonomyWeight: weights.rel.autonomy.toString(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/", "layout");
}

export async function exportData(userId: string) {
  const db = getDb();

  const [userLogs, userScores, userCheckins] = await Promise.all([
    db.select().from(dailyLogs).where(eq(dailyLogs.userId, userId)),
    db.select().from(scores).where(eq(scores.userId, userId)),
    db.select().from(weeklyCheckins).where(eq(weeklyCheckins.userId, userId)),
  ]);

  return {
    exportDate: new Date().toISOString(),
    dailyLogs: userLogs,
    scores: userScores,
    weeklyCheckins: userCheckins,
  };
}
