"use server";

import { getDb } from "@/lib/db";
import { interventions, dailyLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";

export async function completeExercise(data: {
  userId: string;
  exerciseId: string;
  title: string;
  theoryBasis: string;
  targetDimension: string;
  rating: number;
}) {
  const db = getDb();

  // Get the latest daily log to extract scoreBefore for the target dimension
  const [latestLog] = await db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, data.userId))
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
    userId: data.userId,
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
}
