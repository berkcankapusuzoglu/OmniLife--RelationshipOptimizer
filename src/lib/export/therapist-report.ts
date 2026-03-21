import { eq, desc, gte, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  dailyLogs,
  scores,
  constraints,
  interventions,
  weeklyCheckins,
} from "@/lib/db/schema";

export interface DimensionTrend {
  dimension: string;
  values: { date: string; value: number }[];
  average: number;
  trend: "improving" | "declining" | "stable";
}

export interface ConstraintViolationSummary {
  constraintName: string;
  type: string;
  dimension: string;
  occurrences: number;
  latestSeverity: string;
}

export interface ExerciseSummary {
  title: string;
  targetDimension: string;
  wasCompleted: boolean;
  rating: number | null;
  date: string;
}

export interface WeeklyReflection {
  weekStart: string;
  highlight: string | null;
  challenge: string | null;
  gratitude: string | null;
  overallSatisfaction: number;
}

export interface TherapistReportData {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  userName: string;
  scoreSummary: {
    latestLifeScore: number | null;
    latestRelScore: number | null;
    latestTotalQuality: number | null;
    avgLifeScore: number;
    avgRelScore: number;
    avgTotalQuality: number;
  };
  dimensionTrends: DimensionTrend[];
  constraintViolations: ConstraintViolationSummary[];
  exercises: ExerciseSummary[];
  weeklyReflections: WeeklyReflection[];
  totalLogsInPeriod: number;
}

function computeTrend(values: number[]): "improving" | "declining" | "stable" {
  if (values.length < 2) return "stable";
  const first = values.slice(0, Math.ceil(values.length / 2));
  const second = values.slice(Math.ceil(values.length / 2));
  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
  const diff = avgSecond - avgFirst;
  if (diff > 0.5) return "improving";
  if (diff < -0.5) return "declining";
  return "stable";
}

export async function generateTherapistReport(
  userId: string,
  userName: string,
  daysBack: number = 30
): Promise<TherapistReportData> {
  const db = getDb();
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - daysBack);
  const periodStartStr = periodStart.toISOString().split("T")[0];
  const periodEndStr = now.toISOString().split("T")[0];

  // Fetch daily logs for the period
  const logs = await db
    .select()
    .from(dailyLogs)
    .where(
      and(eq(dailyLogs.userId, userId), gte(dailyLogs.date, periodStartStr))
    )
    .orderBy(dailyLogs.date);

  // Fetch scores for the period
  const scoreRows = await db
    .select()
    .from(scores)
    .where(and(eq(scores.userId, userId), gte(scores.date, periodStartStr)))
    .orderBy(scores.date);

  // Latest score
  const latestScore = scoreRows.length > 0 ? scoreRows[scoreRows.length - 1] : null;

  // Average scores
  const avgLife =
    scoreRows.length > 0
      ? scoreRows.reduce((sum, s) => sum + Number(s.lifeScore), 0) /
        scoreRows.length
      : 0;
  const avgRel =
    scoreRows.length > 0
      ? scoreRows.reduce((sum, s) => sum + Number(s.relScore), 0) /
        scoreRows.length
      : 0;
  const avgTotal =
    scoreRows.length > 0
      ? scoreRows.reduce((sum, s) => sum + Number(s.totalQuality), 0) /
        scoreRows.length
      : 0;

  // Build 9-dimension trends
  const dimensionKeys = [
    { key: "vitality", accessor: (l: typeof logs[0]) => l.vitalityScore },
    { key: "growth", accessor: (l: typeof logs[0]) => l.growthScore },
    { key: "security", accessor: (l: typeof logs[0]) => l.securityScore },
    { key: "connection", accessor: (l: typeof logs[0]) => l.connectionScore },
    { key: "emotional", accessor: (l: typeof logs[0]) => l.emotionalScore },
    { key: "trust", accessor: (l: typeof logs[0]) => l.trustScore },
    { key: "fairness", accessor: (l: typeof logs[0]) => l.fairnessScore },
    { key: "stress", accessor: (l: typeof logs[0]) => l.stressScore },
    { key: "autonomy", accessor: (l: typeof logs[0]) => l.autonomyScore },
  ];

  const dimensionTrends: DimensionTrend[] = dimensionKeys.map(
    ({ key, accessor }) => {
      const values = logs.map((l) => ({
        date: l.date,
        value: accessor(l),
      }));
      const numValues = values.map((v) => v.value);
      const average =
        numValues.length > 0
          ? numValues.reduce((a, b) => a + b, 0) / numValues.length
          : 0;
      return {
        dimension: key,
        values,
        average: Math.round(average * 100) / 100,
        trend: computeTrend(numValues),
      };
    }
  );

  // Constraint violations from scores
  const violationMap = new Map<string, ConstraintViolationSummary>();
  for (const score of scoreRows) {
    const violations = score.constraintViolations as Array<{
      constraintName: string;
      type: string;
      dimension: string;
      severity: string;
    }> | null;
    if (!violations) continue;
    for (const v of violations) {
      const existing = violationMap.get(v.constraintName);
      if (existing) {
        existing.occurrences++;
        existing.latestSeverity = v.severity;
      } else {
        violationMap.set(v.constraintName, {
          constraintName: v.constraintName,
          type: v.type,
          dimension: v.dimension,
          occurrences: 1,
          latestSeverity: v.severity,
        });
      }
    }
  }

  // Exercises completed in period
  const exerciseRows = await db
    .select()
    .from(interventions)
    .where(
      and(
        eq(interventions.userId, userId),
        gte(interventions.createdAt, periodStart)
      )
    )
    .orderBy(desc(interventions.createdAt));

  const exercises: ExerciseSummary[] = exerciseRows.map((e) => ({
    title: e.title,
    targetDimension: e.targetDimension ?? "general",
    wasCompleted: e.wasCompleted,
    rating: e.rating,
    date: e.createdAt.toISOString().split("T")[0],
  }));

  // Weekly reflections in period
  const weeklyRows = await db
    .select()
    .from(weeklyCheckins)
    .where(
      and(
        eq(weeklyCheckins.userId, userId),
        gte(weeklyCheckins.weekStart, periodStartStr)
      )
    )
    .orderBy(weeklyCheckins.weekStart);

  const weeklyReflections: WeeklyReflection[] = weeklyRows.map((w) => ({
    weekStart: w.weekStart,
    highlight: w.highlight,
    challenge: w.challenge,
    gratitude: w.gratitude,
    overallSatisfaction: w.overallSatisfaction,
  }));

  return {
    generatedAt: now.toISOString(),
    periodStart: periodStartStr,
    periodEnd: periodEndStr,
    userName,
    scoreSummary: {
      latestLifeScore: latestScore ? Number(latestScore.lifeScore) : null,
      latestRelScore: latestScore ? Number(latestScore.relScore) : null,
      latestTotalQuality: latestScore
        ? Number(latestScore.totalQuality)
        : null,
      avgLifeScore: Math.round(avgLife * 100) / 100,
      avgRelScore: Math.round(avgRel * 100) / 100,
      avgTotalQuality: Math.round(avgTotal * 100) / 100,
    },
    dimensionTrends,
    constraintViolations: Array.from(violationMap.values()),
    exercises,
    weeklyReflections,
    totalLogsInPeriod: logs.length,
  };
}
