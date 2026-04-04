import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { scores, dailyLogs, constraints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { InsightsClient } from "./insights-client";
import { findParetoFrontier, getPositionRelativeToFrontier } from "@/lib/engine/pareto";
import { generateRecommendations } from "@/lib/recommendations/rules";
import { detectTrendViolations } from "@/lib/engine/trends";
import { getUserTier, getFeatureLimits } from "@/lib/subscription/access";
import { BackButton } from "@/components/back-button";
import type { Constraint, OptimizerResult, ParetoAnalysis } from "@/lib/engine/types";

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

  // Compute Pareto analysis for the current point
  let paretoAnalysis: ParetoAnalysis | null = null;
  const latestScore = allScores[0];
  if (latestScore && frontierPoints.length > 0) {
    const currentPt = { lifeScore: Number(latestScore.lifeScore), relScore: Number(latestScore.relScore) };
    const position = getPositionRelativeToFrontier(currentPt, frontierPoints);
    // Determine lagging dimensions relative to nearest frontier point
    const laggingDimensions: string[] = [];
    if (!position.isOnFrontier && currentScores) {
      const { pillars, relDims } = currentScores;
      const allDims: [string, number][] = [
        ['vitality', pillars.vitality],
        ['growth', pillars.growth],
        ['security', pillars.security],
        ['connection', pillars.connection],
        ['emotional', relDims.emotional],
        ['trust', relDims.trust],
        ['fairness', relDims.fairness],
        ['stress', relDims.stress],
        ['autonomy', relDims.autonomy],
      ];
      // Lagging = below average of that dim across frontier dates
      allDims.sort((a, b) => a[1] - b[1]);
      laggingDimensions.push(...allDims.slice(0, 3).map(([k]) => k));
    }
    paretoAnalysis = {
      isOnFrontier: position.isOnFrontier,
      distanceFromFrontier: position.distance,
      nearestFrontierPoint: position.nearestPoint,
      lifeScoreGap: Math.max(0, Math.round((position.nearestPoint.lifeScore - currentPt.lifeScore) * 10) / 10),
      relScoreGap: Math.max(0, Math.round((position.nearestPoint.relScore - currentPt.relScore) * 10) / 10),
      laggingDimensions,
    };
  }

  const recommendations = currentScores
    ? generateRecommendations(
        currentScores.pillars,
        currentScores.relDims,
        allViolations,
        [],
        paretoAnalysis && !paretoAnalysis.isOnFrontier && latestScore
          ? {
              isOnFrontier: paretoAnalysis.isOnFrontier,
              nearestFrontierPoint: paretoAnalysis.nearestFrontierPoint,
              currentLifeScore: Number(latestScore.lifeScore),
              currentRelScore: Number(latestScore.relScore),
              laggingDimensions: paretoAnalysis.laggingDimensions,
            }
          : undefined,
      )
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

  // Run optimizer for insights display
  let optimizerResult: OptimizerResult | null = null;
  if (currentScores) {
    try {
      const { optimizeAllocations } = await import("@/lib/engine/optimizer");
      const { computeAllPenalties: cap2 } = await import("@/lib/engine/penalties");
      const { computeAllScores: cas2 } = await import("@/lib/engine/scoring");

      // Build weights from user record
      const [userRow] = await getDb().select().from((await import("@/lib/db/schema")).users).where(eq((await import("@/lib/db/schema")).users.id, user.id)).limit(1);
      if (userRow) {
        const userWeights = {
          alpha: Number(userRow.alphaWeight),
          beta: Number(userRow.betaWeight),
          pillar: {
            vitality: Number(userRow.pillarVitalityWeight),
            growth: Number(userRow.pillarGrowthWeight),
            security: Number(userRow.pillarSecurityWeight),
            connection: Number(userRow.pillarConnectionWeight),
          },
          rel: {
            emotional: Number(userRow.relEmotionalWeight),
            trust: Number(userRow.relTrustWeight),
            fairness: Number(userRow.relFairnessWeight),
            stress: Number(userRow.relStressWeight),
            autonomy: Number(userRow.relAutonomyWeight),
          },
        };
        const curPenalty = cap2(currentScores.pillars, currentScores.relDims, typedConstraints);
        const curScores = cas2(currentScores.pillars, currentScores.relDims, userWeights, curPenalty.totalPenalty);
        const optResult = optimizeAllocations(currentScores, userWeights, typedConstraints);
        optimizerResult = {
          ...optResult,
          currentTotalQuality: curScores.totalQuality,
          gainFromOptimization: Math.round((optResult.predictedScores.totalQuality - curScores.totalQuality) * 100) / 100,
        };
      }
    } catch {
      // non-critical
    }
  }

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
        <div className="flex items-center gap-3 mb-1">
          <BackButton />
          <h1 className="text-2xl font-medium tracking-tight">Insights</h1>
        </div>
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
        paretoAnalysis={paretoAnalysis}
        optimizerResult={optimizerResult}
        currentDimScores={currentScores ? {
          vitality: currentScores.pillars.vitality,
          growth: currentScores.pillars.growth,
          security: currentScores.pillars.security,
          connection: currentScores.pillars.connection,
          emotional: currentScores.relDims.emotional,
          trust: currentScores.relDims.trust,
          fairness: currentScores.relDims.fairness,
          stress: currentScores.relDims.stress,
          autonomy: currentScores.relDims.autonomy,
        } : undefined}
      />
    </div>
  );
}
