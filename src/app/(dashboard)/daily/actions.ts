"use server";

import { getDb } from "@/lib/db";
import { dailyLogs, scores, users, interventions, weeklyCheckins, constraints, partnerSyncEvents } from "@/lib/db/schema";
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
}): Promise<{ milestones: Milestone[] }> {
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

  if (!user) return { milestones: [] };

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
    .where(eq(constraints.userId, data.userId));

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
    .where(eq(dailyLogs.userId, data.userId))
    .orderBy(desc(dailyLogs.date))
    .limit(5);

  // Sort chronologically (oldest first) for trend detection
  const chronologicalLogs = recentLogs.reverse();
  const trendViolations = detectTrendViolations(chronologicalLogs);

  const allViolations = [...penalty.violations, ...trendViolations];

  await db.insert(scores).values({
    id: uuid(),
    dailyLogId: logId,
    userId: data.userId,
    date: today,
    lifeScore: computed.lifeScore.toString(),
    relScore: computed.relScore.toString(),
    totalQuality: computed.totalQuality.toString(),
    penaltyApplied: penalty.totalPenalty.toString(),
    constraintViolations: allViolations,
    weightsSnapshot: weights,
  });

  // Check divergence with partner (if linked)
  if (user.partnerId) {
    const partnerLatestLog = await db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, user.partnerId))
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
          coupleId: coupleId(data.userId, user.partnerId),
          type: "divergence",
          data: {
            triggeredBy: data.userId,
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
        eq(interventions.userId, data.userId),
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
        .where(eq(interventions.id, intervention.id));
    }
  }

  // Update streak
  const streakResult = await updateStreak(data.userId, today);

  // Track analytics event
  trackEvent("daily_log_submitted", {
    totalQuality: computed.totalQuality,
    currentStreak: streakResult.currentStreak,
  }, data.userId);

  // Gather milestone context
  const [logCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, data.userId));

  const [exerciseCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(interventions)
    .where(
      and(
        eq(interventions.userId, data.userId),
        eq(interventions.wasCompleted, true)
      )
    );

  const [weeklyCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(weeklyCheckins)
    .where(eq(weeklyCheckins.userId, data.userId));

  const newMilestones = checkMilestones({
    currentStreak: streakResult.currentStreak,
    longestStreak: streakResult.longestStreak,
    totalLogs: logCountResult?.count ?? 0,
    exercisesCompleted: exerciseCountResult?.count ?? 0,
    partnerLinked: !!user.partnerId,
    latestTotalQuality: computed.totalQuality,
    weeklyCheckinsCount: weeklyCountResult?.count ?? 0,
    achieved: new Set<string>(), // TODO: persist achieved milestones
  });

  for (const m of newMilestones) {
    trackEvent("milestone_achieved", { milestoneId: m.id, milestoneName: m.name }, data.userId);
  }

  revalidatePath("/", "layout");

  return { milestones: newMilestones };
}
