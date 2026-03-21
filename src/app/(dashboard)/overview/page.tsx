import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { dailyLogs, scores } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";
import { detectTrendViolations } from "@/lib/engine/trends";
import { detectCrisisAlerts } from "@/lib/engine/alerts";

export default async function DashboardPage() {
  const user = await requireAuth();
  const db = getDb();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [recentLogs, recentScores] = await Promise.all([
    db
      .select()
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.userId, user.id),
          gte(dailyLogs.date, sevenDaysAgo.toISOString().split("T")[0])
        )
      )
      .orderBy(desc(dailyLogs.date))
      .limit(7),
    db
      .select()
      .from(scores)
      .where(
        and(
          eq(scores.userId, user.id),
          gte(scores.date, sevenDaysAgo.toISOString().split("T")[0])
        )
      )
      .orderBy(desc(scores.date))
      .limit(7),
  ]);

  const latestLog = recentLogs[0] ?? null;
  const latestScore = recentScores[0] ?? null;

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

  const scoreTrends = recentScores.reverse().map((s) => ({
    date: s.date,
    lifeScore: Number(s.lifeScore),
    relScore: Number(s.relScore),
    totalQuality: Number(s.totalQuality),
  }));

  // Compute trend alerts and crisis warnings
  const chronologicalLogs = [...recentLogs].reverse();
  const trendViolations = detectTrendViolations(chronologicalLogs);
  const crisisAlerts = detectCrisisAlerts(
    chronologicalLogs,
    scoreTrends.map((s) => ({ date: s.date, totalQuality: s.totalQuality })),
  );

  const trendAlerts = trendViolations.map((v) => ({
    dimension: v.dimension,
    message: `${v.dimension} has been declining (${v.threshold} → ${v.actual})`,
  }));

  return (
    <DashboardClient
      currentScores={currentScores}
      latestScore={
        latestScore
          ? {
              lifeScore: Number(latestScore.lifeScore),
              relScore: Number(latestScore.relScore),
              totalQuality: Number(latestScore.totalQuality),
              penaltyApplied: Number(latestScore.penaltyApplied),
            }
          : null
      }
      scoreTrends={scoreTrends}
      userName={user.name ?? "User"}
      currentStreak={user.currentStreak ?? 0}
      longestStreak={user.longestStreak ?? 0}
      trendAlerts={trendAlerts}
      crisisAlerts={crisisAlerts}
    />
  );
}
