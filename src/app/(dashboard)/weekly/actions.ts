"use server";

import { getDb } from "@/lib/db";
import { weeklyCheckins } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";

export async function submitWeeklyCheckin(data: {
  highlight: string;
  challenge: string;
  gratitude: string;
  partnerAppreciation: string;
  overallSatisfaction: number;
  weeklyGoals: string[];
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const db = getDb();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);

  await db.insert(weeklyCheckins).values({
    id: uuid(),
    userId: session.userId,
    weekStart: weekStart.toISOString().split("T")[0],
    highlight: data.highlight,
    challenge: data.challenge,
    gratitude: data.gratitude,
    partnerAppreciation: data.partnerAppreciation,
    overallSatisfaction: data.overallSatisfaction,
    weeklyGoals: data.weeklyGoals,
  });

  revalidatePath("/", "layout");
  redirect("/overview");
}
