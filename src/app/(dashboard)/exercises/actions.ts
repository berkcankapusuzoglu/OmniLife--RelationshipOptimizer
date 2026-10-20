"use server";

import { getDb } from "@/lib/db";
import { interventions, dailyLogs } from "@/lib/db/schema";
import { and, count, eq, desc, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";
import { requireAuth } from "@/lib/auth/guard";
import { exerciseInput } from "@/lib/auth/action-inputs";
import { getUserTier } from "@/lib/subscription/access";
import { exercisesRemainingThisWeek, weeklyWindowStart } from "@/lib/subscription/history";

export async function completeExercise(data: {
  exerciseId: string;
  title: string;
  theoryBasis: string;
  targetDimension: string;
  rating: number;
}): Promise<{ error?: string }> {
  const user = await requireAuth();
  data = exerciseInput.parse(data);
  const db = getDb();

  // Server-enforced weekly limit: count this user's completions in the rolling week.
  const tier = await getUserTier(user.id);
  const [completed] = await db
    .select({ count: count() })
    .from(interventions)
    // Bound as a raw Date param (postgres.js serializes Dates) so the window is an exact timestamp.
    .where(and(eq(interventions.userId, user.id), gte(interventions.createdAt, sql`${weeklyWindowStart()}`)));
  const completedLast7Days = Number(completed?.count ?? 0) || 0;
  if (exercisesRemainingThisWeek(tier, completedLast7Days) <= 0) {
    return { error: "You've used all of this week's exercises. Premium unlocks the full library." };
  }

  // Get the latest daily log to extract scoreBefore for the target dimension
  const [latestLog] = await db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, user.id))
    .orderBy(desc(dailyLogs.date))
    .limit(1);

  const dimScoreMap: Record<string, number | undefined> = latestLog
    ? {
        vitality: latestLog.vitalityScore,
        growth: latestLog.growthScore,
        security: latestLog.securityScore,
        connection: latestLog.connectionScore,
        emotional: latestLog.emotionalScore,
        trust: latestLog.trustScore,
        fairness: latestLog.fairnessScore,
        stress: latestLog.stressScore,
        autonomy: latestLog.autonomyScore,
      }
    : {};

  const scoreBefore = dimScoreMap[data.targetDimension];

  await db.insert(interventions).values({
    id: uuid(),
    userId: user.id,
    type: data.exerciseId,
    title: data.title,
    description: `Completed exercise: ${data.title}`,
    theoryBasis: data.theoryBasis,
    targetDimension: data.targetDimension,
    wasCompleted: true,
    rating: data.rating,
    scoreBefore: scoreBefore !== undefined ? scoreBefore.toString() : null,
  });

  revalidatePath("/exercises");
  return { error: undefined };
}
