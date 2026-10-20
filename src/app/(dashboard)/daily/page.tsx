import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { dailyLogs, scores } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { DailyLogWizard } from "./daily-client";
import Link from "next/link";

const DIMENSION_LABELS = [
  ["vitalityScore", "Vitality"],
  ["growthScore", "Growth"],
  ["securityScore", "Security"],
  ["connectionScore", "Connection"],
  ["emotionalScore", "Emotional"],
  ["trustScore", "Trust"],
  ["fairnessScore", "Fairness"],
  ["stressScore", "Stress"],
  ["autonomyScore", "Autonomy"],
  ["mood", "Mood"],
  ["energyLevel", "Energy"],
] as const;

export default async function DailyPage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string | string[] }>;
}) {
  const user = await requireAuth();
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];
  const params = (await searchParams) ?? {};
  const wantsEdit = params.edit === "1" || params.edit === "true";

  // Check if already logged today
  const [existingLog] = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, user.id), eq(dailyLogs.date, today)))
    .limit(1);

  // Already logged today: show the entry with an Edit action. `?edit=1` opens the
  // wizard pre-filled with today's values so the onboarding-sourced log (or a
  // mistaken entry) can be replaced; the action updates in place.
  if (existingLog && !wantsEdit) {
    const isOnboardingLog = existingLog.notes === "Initial assessment from onboarding";
    // Fetch today's scores
    const [todayScores] = await db
      .select()
      .from(scores)
      .where(and(eq(scores.userId, user.id), eq(scores.date, today)))
      .limit(1);

    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-3xl font-bold text-green-500">
              ✓
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            You&apos;ve already logged today
          </h1>
          <p className="mb-8 text-muted-foreground">
            {isOnboardingLog
              ? "Today\u2019s entry comes from your onboarding self-assessment. You can refine it any time today."
              : "Come back tomorrow to log again. Consistency is key!"}
          </p>

          {todayScores && (
            <div className="mb-8 grid grid-cols-3 gap-4 rounded-xl border bg-card p-6">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {Number(todayScores.lifeScore).toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Life</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {Number(todayScores.relScore).toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Relationship</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {Number(todayScores.totalQuality).toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          )}

          <div className="mb-8 rounded-xl border bg-card p-4 text-left" data-testid="today-log-values">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Today&apos;s entry
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              {DIMENSION_LABELS.map(([column, label]) => (
                <div key={column} className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-mono font-medium tabular-nums">{existingLog[column]}/10</dd>
                </div>
              ))}
            </dl>
            {existingLog.notes && !isOnboardingLog && (
              <p className="mt-3 text-sm text-muted-foreground">{existingLog.notes}</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/daily?edit=1"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Edit Today&apos;s Log
            </Link>
            <Link
              href="/exercises"
              className="inline-flex h-12 items-center justify-center rounded-md border bg-background px-6 text-sm font-medium hover:bg-accent"
            >
              Do Today&apos;s Exercises
            </Link>
            <Link
              href="/overview"
              className="inline-flex h-12 items-center justify-center rounded-md border bg-background px-6 text-sm font-medium hover:bg-accent"
            >
              View Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch recent logs for adaptive prompting + calibration
  const recentLogs = await db
    .select({
      mood: dailyLogs.mood,
      date: dailyLogs.date,
      vitality: dailyLogs.vitalityScore,
      growth: dailyLogs.growthScore,
      security: dailyLogs.securityScore,
      connection: dailyLogs.connectionScore,
      emotional: dailyLogs.emotionalScore,
      trust: dailyLogs.trustScore,
      fairness: dailyLogs.fairnessScore,
      stress: dailyLogs.stressScore,
      autonomy: dailyLogs.autonomyScore,
      energyLevel: dailyLogs.energyLevel,
    })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, user.id))
    .orderBy(desc(dailyLogs.date))
    .limit(10);

  const totalQuickLogs = recentLogs.length;
  const recentMoodAvg =
    recentLogs.length > 0
      ? recentLogs.reduce((sum, l) => sum + l.mood, 0) / recentLogs.length
      : null;

  // Compute recent averages for calibration pre-fill
  const calibrationDefaults =
    recentLogs.length >= 3
      ? {
          growth: Math.round(recentLogs.reduce((s, l) => s + l.growth, 0) / recentLogs.length),
          security: Math.round(recentLogs.reduce((s, l) => s + l.security, 0) / recentLogs.length),
          fairness: Math.round(recentLogs.reduce((s, l) => s + l.fairness, 0) / recentLogs.length),
          autonomy: Math.round(recentLogs.reduce((s, l) => s + l.autonomy, 0) / recentLogs.length),
        }
      : null;

  // Previous log values used as carry-forward defaults for non-asked quick-mode dimensions.
  // When editing, today's own entry is the source so the wizard opens pre-filled.
  const prevLog = existingLog
    ? {
        vitality: existingLog.vitalityScore,
        growth: existingLog.growthScore,
        security: existingLog.securityScore,
        connection: existingLog.connectionScore,
        emotional: existingLog.emotionalScore,
        trust: existingLog.trustScore,
        fairness: existingLog.fairnessScore,
        stress: existingLog.stressScore,
        autonomy: existingLog.autonomyScore,
        mood: existingLog.mood,
        energyLevel: existingLog.energyLevel,
      }
    : recentLogs[0] ?? null;
  const previousLogValues = prevLog
    ? {
        vitality: prevLog.vitality,
        growth: prevLog.growth,
        security: prevLog.security,
        connection: prevLog.connection,
        emotional: prevLog.emotional,
        trust: prevLog.trust,
        fairness: prevLog.fairness,
        stress: prevLog.stress,
        autonomy: prevLog.autonomy,
        mood: prevLog.mood,
        energy: prevLog.energyLevel,
      }
    : null;

  return (
    <DailyLogWizard
      recentMoodAvg={recentMoodAvg}
      totalLogs={totalQuickLogs}
      calibrationDefaults={calibrationDefaults}
      previousLogValues={previousLogValues}
    />
  );
}
