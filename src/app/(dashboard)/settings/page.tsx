import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { dailyLogs, scores } from "@/lib/db/schema";
import { eq, count, asc } from "drizzle-orm";
import { SettingsClient } from "./settings-client";
import { computeWeightSuggestions } from "@/lib/engine/calibration";
import type { CalibrationResult } from "@/lib/engine/calibration";
import type { Weights } from "@/lib/engine/types";

export default async function SettingsPage() {
  const user = await requireAuth();
  const db = getDb();

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

  // Check log count for calibration eligibility
  const [logCountResult] = await db
    .select({ value: count() })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, user.id));
  const logCount = logCountResult?.value ?? 0;

  let calibration: CalibrationResult | null = null;

  if (logCount >= 14) {
    // Fetch all logs and scores for calibration
    const [allLogs, allScores] = await Promise.all([
      db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.userId, user.id))
        .orderBy(asc(dailyLogs.date)),
      db
        .select()
        .from(scores)
        .where(eq(scores.userId, user.id))
        .orderBy(asc(scores.date)),
    ]);

    calibration = computeWeightSuggestions(
      allLogs.map((l) => ({
        vitalityScore: l.vitalityScore,
        growthScore: l.growthScore,
        securityScore: l.securityScore,
        connectionScore: l.connectionScore,
        emotionalScore: l.emotionalScore,
        trustScore: l.trustScore,
        fairnessScore: l.fairnessScore,
        stressScore: l.stressScore,
        autonomyScore: l.autonomyScore,
      })),
      allScores.map((s) => ({
        totalQuality: Number(s.totalQuality),
      })),
      weights
    );
  }

  // Serialize calibration as plain data for client
  const calibrationData = calibration
    ? {
        eligible: calibration.eligible,
        summary: calibration.summary,
        suggestions: calibration.suggestions.map((s) => ({
          dimension: s.dimension,
          label: s.label,
          currentWeight: s.currentWeight,
          suggestedWeight: s.suggestedWeight,
          delta: s.delta,
          reasoning: s.reasoning,
          group: s.group,
        })),
      }
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, weights, and preferences
        </p>
      </div>
      <SettingsClient
        user={{
          id: user.id,
          name: user.name ?? "",
          email: user.email,
          subscriptionTier: user.subscriptionTier ?? "free",
          subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
          stripeCustomerId: user.stripeCustomerId ?? null,
        }}
        weights={weights}
        calibration={calibrationData}
        logCount={logCount}
      />
    </div>
  );
}
