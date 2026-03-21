import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { scores, dailyLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { InsightsClient } from "./insights-client";
import { findParetoFrontier } from "@/lib/engine/pareto";
import { generateRecommendations } from "@/lib/recommendations/rules";
import { getUserTier } from "@/lib/subscription/access";

export default async function InsightsPage() {
  const user = await requireAuth();
  const userTier = await getUserTier(user.id);
  const db = getDb();

  const [allScores, recentLogs] = await Promise.all([
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

  const recommendations = currentScores
    ? generateRecommendations(currentScores.pillars, currentScores.relDims, [], [])
    : [];

  const trendData = recentLogs.reverse().map((log) => ({
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Pareto frontier, trends, and personalized recommendations
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
      />
    </div>
  );
}
