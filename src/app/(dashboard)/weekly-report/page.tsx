import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { dailyLogs, scores, interventions, constraints } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { WeeklyReportClient } from "./report-client";

function getWeekBounds(offset: number = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

export default async function WeeklyReportPage() {
  const user = await requireAuth();
  const db = getDb();

  const thisWeek = getWeekBounds(0);
  const lastWeek = getWeekBounds(-1);

  // Fetch logs and scores for this week and last week
  const [thisWeekLogs, lastWeekLogs, thisWeekScores, lastWeekScores] =
    await Promise.all([
      db
        .select()
        .from(dailyLogs)
        .where(
          and(
            eq(dailyLogs.userId, user.id),
            gte(dailyLogs.date, thisWeek.start),
            lte(dailyLogs.date, thisWeek.end)
          )
        )
        .orderBy(dailyLogs.date),
      db
        .select()
        .from(dailyLogs)
        .where(
          and(
            eq(dailyLogs.userId, user.id),
            gte(dailyLogs.date, lastWeek.start),
            lte(dailyLogs.date, lastWeek.end)
          )
        )
        .orderBy(dailyLogs.date),
      db
        .select()
        .from(scores)
        .where(
          and(
            eq(scores.userId, user.id),
            gte(scores.date, thisWeek.start),
            lte(scores.date, thisWeek.end)
          )
        )
        .orderBy(scores.date),
      db
        .select()
        .from(scores)
        .where(
          and(
            eq(scores.userId, user.id),
            gte(scores.date, lastWeek.start),
            lte(scores.date, lastWeek.end)
          )
        )
        .orderBy(scores.date),
    ]);

  // Exercises completed this week
  const thisWeekExercises = await db
    .select()
    .from(interventions)
    .where(
      and(
        eq(interventions.userId, user.id),
        eq(interventions.wasCompleted, true),
        gte(interventions.createdAt, new Date(thisWeek.start)),
        lte(interventions.createdAt, new Date(thisWeek.end + "T23:59:59Z"))
      )
    );

  // Serialize data as plain objects for client component
  const serializeLogs = (logs: typeof thisWeekLogs) =>
    logs.map((l) => ({
      date: l.date,
      vitality: l.vitalityScore,
      growth: l.growthScore,
      security: l.securityScore,
      connection: l.connectionScore,
      emotional: l.emotionalScore,
      trust: l.trustScore,
      fairness: l.fairnessScore,
      stress: l.stressScore,
      autonomy: l.autonomyScore,
      mood: l.mood,
      energyLevel: l.energyLevel,
    }));

  const serializeScores = (s: typeof thisWeekScores) =>
    s.map((sc) => ({
      date: sc.date,
      lifeScore: Number(sc.lifeScore),
      relScore: Number(sc.relScore),
      totalQuality: Number(sc.totalQuality),
      penaltyApplied: Number(sc.penaltyApplied ?? 0),
      constraintViolations: (sc.constraintViolations ?? []) as Array<{
        constraintName: string;
        dimension: string;
        severity: string;
      }>,
    }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Weekly Report</h1>
        <p className="text-sm text-muted-foreground">
          Week of {thisWeek.start} to {thisWeek.end}
        </p>
      </div>
      <WeeklyReportClient
        thisWeekLogs={serializeLogs(thisWeekLogs)}
        lastWeekLogs={serializeLogs(lastWeekLogs)}
        thisWeekScores={serializeScores(thisWeekScores)}
        lastWeekScores={serializeScores(lastWeekScores)}
        exercisesCompleted={thisWeekExercises.length}
        currentStreak={user.currentStreak ?? 0}
        longestStreak={user.longestStreak ?? 0}
        weekRange={thisWeek}
      />
    </div>
  );
}
