import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { coachingUsage } from "@/lib/db/schema";
import { TIERS, type SubscriptionTier } from "@/lib/subscription/tiers";

export interface CoachingQuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
}

/** Calendar day in UTC, `YYYY-MM-DD`. The quota resets at midnight UTC. */
export function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

/** Gemini model id, overridable per environment without a deploy. */
export function coachingModel(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

/**
 * Daily AI message allowance for a tier. Reads `features.aiDailyMessageQuota`
 * once the feature matrix carries it; until then a tier with `aiCoaching`
 * gets the product default of 30 messages/day and every other tier gets 0.
 */
export function coachingQuotaForTier(tier: SubscriptionTier): number {
  const features = TIERS[tier].features as { aiCoaching: boolean; aiDailyMessageQuota?: number };
  if (typeof features.aiDailyMessageQuota === "number") return features.aiDailyMessageQuota;
  return features.aiCoaching ? 30 : 0;
}

/**
 * Atomically reserves one coaching message for the user on `day`.
 *
 * Single statement:
 *   insert into coaching_usage (user_id, day, count) values ($1, $2, 1)
 *   on conflict (user_id, day) do update set count = coaching_usage.count + 1
 *   where coaching_usage.count < $limit
 *   returning count
 *
 * When the guard fails Postgres updates nothing and returns no row, so two
 * concurrent requests can never both slip past the cap.
 */
export async function consumeCoachingQuota(
  userId: string,
  limit: number,
  day: string = todayUtc()
): Promise<CoachingQuotaResult> {
  if (limit <= 0) return { allowed: false, used: 0, limit };

  const rows = await getDb()
    .insert(coachingUsage)
    .values({ userId, day, count: 1 })
    .onConflictDoUpdate({
      target: [coachingUsage.userId, coachingUsage.day],
      set: { count: sql`${coachingUsage.count} + 1` },
      setWhere: sql`${coachingUsage.count} < ${limit}`,
    })
    .returning({ count: coachingUsage.count });

  if (rows.length === 0) return { allowed: false, used: limit, limit };
  return { allowed: true, used: rows[0].count, limit };
}

/** Gives back one reserved message when the provider never answered. */
export async function refundCoachingQuota(userId: string, day: string = todayUtc()): Promise<void> {
  await getDb()
    .update(coachingUsage)
    .set({ count: sql`greatest(${coachingUsage.count} - 1, 0)` })
    .where(and(eq(coachingUsage.userId, userId), eq(coachingUsage.day, day)));
}
