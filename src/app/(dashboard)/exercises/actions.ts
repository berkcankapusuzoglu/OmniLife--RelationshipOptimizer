"use server";

import { getDb } from "@/lib/db";
import { interventions } from "@/lib/db/schema";
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
  });

  revalidatePath("/exercises");
}
