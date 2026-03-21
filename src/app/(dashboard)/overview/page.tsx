import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { dailyLogs, scores } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";

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
    />
  );
}
