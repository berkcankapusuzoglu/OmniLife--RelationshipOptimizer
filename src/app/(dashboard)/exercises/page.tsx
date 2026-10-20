import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { dailyLogs, interventions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ExercisesClient } from "./exercises-client";
import { getUserTier } from "@/lib/subscription/access";
import { exercisesRemainingThisWeek, weeklyWindowStart } from "@/lib/subscription/history";
import { computeInterventionImpact } from "@/lib/engine/impact";

export default async function ExercisesPage() {
  const user = await requireAuth();
  const userTier = await getUserTier(user.id);
  const db = getDb();

  const sevenDaysAgo = weeklyWindowStart();

  const [latestLog, recentInterventions] = await Promise.all([
    db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, user.id))
      .orderBy(desc(dailyLogs.date))
      .limit(1),
    db
      .select()
      .from(interventions)
      .where(eq(interventions.userId, user.id))
      .orderBy(desc(interventions.createdAt))
      .limit(20),
  ]);

  const log = latestLog[0];
  const currentScores = log
    ? {
        pillars: {
          vitality: log.vitalityScore,
          growth: log.growthScore,
          security: log.securityScore,
          connection: log.connectionScore,
        },
        relDims: {
          emotional: log.emotionalScore,
          trust: log.trustScore,
          fairness: log.fairnessScore,
          stress: log.stressScore,
          autonomy: log.autonomyScore,
        },
      }
    : null;

  const completedThisWeek = recentInterventions.filter(
    (i) => i.createdAt && new Date(i.createdAt) >= sevenDaysAgo
  );
  const recentExerciseIds = completedThisWeek.map((i) => i.type);
  // Mirrors the server check in completeExercise; the client only displays it.
  const remainingThisWeek = exercisesRemainingThisWeek(userTier, completedThisWeek.length);

  // Compute impact from completed interventions
  const impactSummary = computeInterventionImpact(recentInterventions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Connection Exercises
        </h1>
        <p className="text-sm text-muted-foreground">
          Curated exercises based on your scores and psychology research
        </p>
      </div>
      <ExercisesClient
        currentScores={currentScores}
        recentExerciseIds={recentExerciseIds}
        userTier={userTier}
        remainingThisWeek={remainingThisWeek}
        impactSummary={impactSummary}
      />
    </div>
  );
}
