"use server";

import { getDb } from "@/lib/db";
import { dailyLogs, scores, interventions, weeklyCheckins, constraints, partnerSyncEvents } from "@/lib/db/schema";
import { eq, and, sql, desc, isNull } from "drizzle-orm";
import { detectDivergence } from "@/lib/engine/divergence";
import { coupleId } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { computeAllScores } from "@/lib/engine/scoring";
import { computeAllPenalties } from "@/lib/engine/penalties";
import { detectTrendViolations } from "@/lib/engine/trends";
import type { PillarScores, RelDimScores, Weights, Constraint } from "@/lib/engine/types";
import { v4 as uuid } from "uuid";
import { updateStreak } from "@/lib/streaks";
import { checkMilestones } from "@/lib/milestones";
import type { Milestone } from "@/lib/milestones";
import { trackEvent } from "@/lib/analytics/track";
import { optimizeAllocations } from "@/lib/engine/optimizer";
import type { OptimizerResult } from "@/lib/engine/types";
import { requireAuth } from "@/lib/auth/guard";
import { dailyInput } from "@/lib/auth/action-inputs";
import { linkedPartnerId } from "@/lib/auth/authorization";

export async function submitDailyLog(data: {
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
}): Promise<{ milestones: Milestone[]; optimizerResult?: OptimizerResult; isFirstLog: boolean }> {
  const user = await requireAuth();
  data = dailyInput.parse(data);
  const userId = user.id;
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  // One log per day: a second submission today (e.g. refining the
  // onboarding-sourced entry) replaces the existing row and its score.
  const [existingLog] = await db
    .select({ id: dailyLogs.id })
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, today)))
    .limit(1);
  const isEdit = !!existingLog;
  const logId = existingLog?.id ?? uuid();
  const logValues = {
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
  };
  if (isEdit) {
    await db
      .update(dailyLogs)
      .set(logValues)
      .where(and(eq(dailyLogs.id, logId), eq(dailyLogs.userId, userId)));
  } else {
    await db.insert(dailyLogs).values({ id: logId, userId, date: today, ...logValues });
  }

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

  // Fetch user constraints from DB and convert numeric strings
  const userConstraints = await db
    .select()
    .from(constraints)
    .where(eq(constraints.userId, userId));

  const typedConstraints: Constraint[] = userConstraints.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    dimension: c.dimension ?? '',
    minValue: c.minValue ? Number(c.minValue) : undefined,
    maxValue: c.maxValue ? Number(c.maxValue) : undefined,
    budgetHours: c.budgetHours ? Number(c.budgetHours) : undefined,
    isActive: c.isActive,
  }));

  const penalty = computeAllPenalties(pillars, relDims, typedConstraints);
  const computed = computeAllScores(pillars, relDims, weights, penalty.totalPenalty);

  // Detect trend violations from recent logs
  const recentLogs = await db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, userId))
    .orderBy(desc(dailyLogs.date))
    .limit(5);

  // Sort chronologically (oldest first) for trend detection
  const chronologicalLogs = recentLogs.reverse();
  const trendViolations = detectTrendViolations(chronologicalLogs);

  const allViolations = [...penalty.violations, ...trendViolations];

  const scoreValues = {
    lifeScore: computed.lifeScore.toString(),
    relScore: computed.relScore.toString(),
    totalQuality: computed.totalQuality.toString(),
    penaltyApplied: penalty.totalPenalty.toString(),
    constraintViolations: allViolations,
    weightsSnapshot: weights,
  };
  if (isEdit) {
    // Replace today's score row so history never carries two entries for one day.
    await db
      .delete(scores)
      .where(and(eq(scores.userId, userId), eq(scores.date, today)));
  }
  await db.insert(scores).values({
    id: uuid(),
    dailyLogId: logId,
    userId,
    date: today,
    ...scoreValues,
  });

  // Check divergence with partner (if linked)
  const partnerId = await linkedPartnerId(user);
  if (partnerId) {
    const partnerLatestLog = await db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, partnerId))
      .orderBy(desc(dailyLogs.date))
      .limit(1);

    if (partnerLatestLog.length > 0) {
      const partnerLog = partnerLatestLog[0];
      const partnerRelDims = {
        emotional: partnerLog.emotionalScore,
        trust: partnerLog.trustScore,
        fairness: partnerLog.fairnessScore,
        stress: partnerLog.stressScore,
        autonomy: partnerLog.autonomyScore,
      };

      const divergences = detectDivergence(relDims, partnerRelDims);
      if (divergences.length > 0) {
        await db.insert(partnerSyncEvents).values({
          id: uuid(),
          coupleId: coupleId(userId, partnerId),
          type: "divergence",
          data: {
            triggeredBy: userId,
            date: today,
            divergences,
          },
        });
      }
    }
  }

  // Backfill scoreAfter for recent interventions that have scoreBefore but no scoreAfter
  const targetDimScores: Record<string, number> = {
    vitality: data.vitality,
    growth: data.growth,
    security: data.security,
    connection: data.connection,
    emotional: data.emotional,
    trust: data.trust,
    fairness: data.fairness,
    stress: data.stress,
    autonomy: data.autonomy,
  };

  const pendingInterventions = await db
    .select()
    .from(interventions)
    .where(
      and(
        eq(interventions.userId, userId),
        eq(interventions.wasCompleted, true),
        isNull(interventions.scoreAfter),
      )
    );

  for (const intervention of pendingInterventions) {
    const dim = intervention.targetDimension;
    if (dim && targetDimScores[dim] !== undefined) {
      await db
        .update(interventions)
        .set({ scoreAfter: targetDimScores[dim].toString() })
        .where(and(eq(interventions.id, intervention.id), eq(interventions.userId, userId)));
    }
  }

  // Update streak
  const streakResult = await updateStreak(userId, today);

  // Track analytics event
  trackEvent("daily_log_submitted", {
    totalQuality: computed.totalQuality,
    currentStreak: streakResult.currentStreak,
  }, userId);

  // Gather milestone context
  const [logCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, userId));

  const [exerciseCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(interventions)
    .where(
      and(
        eq(interventions.userId, userId),
        eq(interventions.wasCompleted, true)
      )
    );

  const [weeklyCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(weeklyCheckins)
    .where(eq(weeklyCheckins.userId, userId));

  const totalLogs = logCountResult?.count ?? 0;
  // The client shows the one-time notification pre-prompt only after the first log,
  // never after editing an existing entry.
  const isFirstLog = totalLogs === 1 && !isEdit;

  // Editing never re-awards milestones already earned by the original entry.
  const newMilestones = isEdit ? [] : checkMilestones({
    currentStreak: streakResult.currentStreak,
    longestStreak: streakResult.longestStreak,
    totalLogs,
    exercisesCompleted: exerciseCountResult?.count ?? 0,
    partnerLinked: !!user.partnerId,
    latestTotalQuality: computed.totalQuality,
    weeklyCheckinsCount: weeklyCountResult?.count ?? 0,
    achieved: new Set<string>(), // TODO: persist achieved milestones
  });

  for (const m of newMilestones) {
    trackEvent("milestone_achieved", { milestoneId: m.id, milestoneName: m.name }, userId);
  }

  // Run Nelder-Mead optimizer to suggest optimal allocations
  let optimizerResult: OptimizerResult | undefined;
  try {
    const optResult = optimizeAllocations(
      { pillars, relDims },
      weights,
      typedConstraints,
    );
    const gainFromOptimization =
      Math.round(
        (optResult.predictedScores.totalQuality - computed.totalQuality) * 100,
      ) / 100;
    optimizerResult = {
      ...optResult,
      currentTotalQuality: computed.totalQuality,
      gainFromOptimization,
    };
  } catch {
    // optimizer is non-critical — never block the log submission
  }

  revalidatePath("/", "layout");

  return { milestones: newMilestones, optimizerResult, isFirstLog };
}
