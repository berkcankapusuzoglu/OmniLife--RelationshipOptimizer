import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { scores, dailyLogs, constraints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { InsightsClient } from "./insights-client";
import { findParetoFrontier } from "@/lib/engine/pareto";
import { generateRecommendations } from "@/lib/recommendations/rules";
import { detectTrendViolations } from "@/lib/engine/trends";
import { getUserTier, getFeatureLimits } from "@/lib/subscription/access";
import type { Constraint } from "@/lib/engine/types";

export default async function InsightsPage() {
  const user = await requireAuth();
  const userTier = await getUserTier(user.id);
  const db = getDb();

  const [allScores, recentLogs, userConstraints] = await Promise.all([
    db
      .select()
      .from(scores)
      .where(eq(scores.userId, user.id))
      .orderBy(desc(scores.date))
      .limit(90),
    db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, user.id))
      .orderBy(desc(dailyLogs.date))
      .limit(30),
    db
      .select()
      .from(constraints)
      .where(eq(constraints.userId, user.id)),
  ]);

  const historicalPoints = allScores.map((s) => ({
    lifeScore: Number(s.lifeScore),
    relScore: Number(s.relScore),
    date: s.date,
  }));

  const frontierPoints = findParetoFrontier(historicalPoints);

  const latestLog = recentLogs[0];
  const currentScores = latestLog
    ? {
        pillars: {
          vitality: latestLog.vitalityScore,
          growth: latestLog.growthScore,
          security: latestLog.securityScore,
          connection: latestLog.connectionScore,
        },
        relDims: {
          emotional: latestLog.emotionalScore,
          trust: latestLog.trustScore,
          fairness: latestLog.fairnessScore,
          stress: latestLog.stressScore,
          autonomy: latestLog.autonomyScore,
        },
      }
    : null;

  // Convert DB constraints to typed constraints
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

  // Detect trend violations from recent logs (chronological order)
  const chronologicalLogs = [...recentLogs].reverse();
  const trendViolations = detectTrendViolations(chronologicalLogs);

  // Compute constraint violations for recommendations
  const { computeAllPenalties } = await import("@/lib/engine/penalties");
  const constraintViolations = currentScores
    ? computeAllPenalties(currentScores.pillars, currentScores.relDims, typedConstraints).violations
    : [];

  const allViolations = [...constraintViolations, ...trendViolations];

  const recommendations = currentScores
    ? generateRecommendations(currentScores.pillars, currentScores.relDims, allViolations, [])
    : [];

  const limits = getFeatureLimits(userTier);
  const historyLimit = limits.historyDays === Infinity ? recentLogs.length : limits.historyDays;
  const limitedLogs = recentLogs.slice(0, historyLimit);

  const trendData = limitedLogs.reverse().map((log) => ({
    date: log.date,
    vitality: log.vitalityScore,
    growth: log.growthScore,
    security: log.securityScore,
    connection: log.connectionScore,
    emotional: log.emotionalScore,
    trust: log.trustScore,
    fairness: log.fairnessScore,
    stress: log.stressScore,
    autonomy: log.autonomyScore,
  }));

  // Generate action plan
  const { generateActionPlan } = await import("@/lib/recommendations/action-plan");
  const actionPlan = currentScores
    ? generateActionPlan(currentScores.pillars, currentScores.relDims)
    : [];

  // Fetch partner scores for comparison (if partner linked)
  let partnerPoints: { lifeScore: number; relScore: number; date: string }[] = [];
  if (user.partnerId) {
    const partnerScores = await db
      .select()
      .from(scores)
      .where(eq(scores.userId, user.partnerId))
      .orderBy(desc(scores.date))
      .limit(90);

    partnerPoints = partnerScores.map((s) => ({
      lifeScore: Number(s.lifeScore),
      relScore: Number(s.relScore),
      date: s.date,
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Balance analysis, trends, and personalized recommendations
        </p>
      </div>
      <InsightsClient
        historicalPoints={historicalPoints}
        frontierPoints={frontierPoints}
        currentPoint={
          historicalPoints.length > 0
            ? {
                lifeScore: historicalPoints[0].lifeScore,
                relScore: historicalPoints[0].relScore,
              }
            : null
        }
        recommendations={recommendations}
        trendData={trendData}
        userTier={userTier}
        actionPlan={actionPlan}
        partnerPoints={partnerPoints.length > 0 ? partnerPoints : undefined}
      />
    </div>
  );
}
