"use server";

import { getDb } from "@/lib/db";
import { users, dailyLogs, scores, weeklyCheckins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { Weights } from "@/lib/engine/types";
import { requireAuth } from "@/lib/auth/guard";
import { profileName, weightsInput } from "@/lib/auth/action-inputs";
import { verifyPassword } from "@/lib/auth/password";
import { deleteSession } from "@/lib/auth/session";
import { BillingDeletionError, deleteAccount } from "@/lib/account/delete-account";
import { redirect } from "next/navigation";
import { hasFeatureAccess } from "@/lib/auth/tier-gate";

export async function deleteAccountAction(_state: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await requireAuth();
  if (formData.get("confirmation") !== "DELETE") {
    return { error: "Type DELETE exactly to confirm permanent account deletion." };
  }
  const password = formData.get("password");
  if (typeof password !== "string" || !password || password.length > 1024 || !await verifyPassword(password, user.passwordHash)) {
    return { error: "Your current password is incorrect. Reset your password if you cannot sign in." };
  }
  try {
    await deleteAccount(user.id);
  } catch (error) {
    if (error instanceof BillingDeletionError) return { error: error.message };
    return { error: "Account deletion did not finish. Your app data has been kept. Billing may already have been canceled. Try again, or contact support through the deletion page." };
  }
  await deleteSession();
  redirect("/delete-account?deleted=1");
}

export async function updateProfile(formData: FormData) {
  const user = await requireAuth();
  const db = getDb();
  const userId = user.id;
  const name = profileName.parse(formData.get("name"));

  await db.update(users).set({ name }).where(eq(users.id, userId));

  revalidatePath("/settings");
}

export async function updateWeights(weights: Weights) {
  const user = await requireAuth();
  weights = weightsInput.parse(weights);
  const userId = user.id;
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

export async function exportData() {
  const user = await requireAuth();
  const access = await hasFeatureAccess(user.id, "exportReports");
  if (!access.allowed) return { error: "Data export is a Premium feature." } as const;
  const userId = user.id;
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
