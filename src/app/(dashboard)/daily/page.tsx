import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { dailyLogs, scores } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { DailyLogWizard } from "./daily-client";
import Link from "next/link";

export default async function DailyPage() {
  const user = await requireAuth();
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  // Check if already logged today
  const [existingLog] = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, user.id), eq(dailyLogs.date, today)))
    .limit(1);

  if (existingLog) {
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
            Come back tomorrow to log again. Consistency is key!
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

          <div className="flex flex-col gap-3">
            <Link
              href="/exercises"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
      growth: dailyLogs.growthScore,
      security: dailyLogs.securityScore,
      fairness: dailyLogs.fairnessScore,
      autonomy: dailyLogs.autonomyScore,
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

  return (
    <DailyLogWizard
      userId={user.id}
      recentMoodAvg={recentMoodAvg}
      totalLogs={totalQuickLogs}
      calibrationDefaults={calibrationDefaults}
    />
  );
}
