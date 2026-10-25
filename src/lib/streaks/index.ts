import { getDb } from "@/lib/db";
import { dailyLogs, users } from "@/lib/db/schema";
import { and, eq, gte } from "drizzle-orm";

import { FORGIVENESS_WINDOW_DAYS, resolveStreak } from "./forgiveness";

export {
  FORGIVENESS_WINDOW_DAYS,
  dayDifference,
  lastForgivenessDate,
  resolveStreak,
} from "./forgiveness";

/**
 * Update streak after a daily log submission.
 * Returns the updated streak values.
 */
export async function updateStreak(
  userId: string,
  logDate: string
): Promise<{ currentStreak: number; longestStreak: number; forgiven: boolean }> {
  const db = getDb();

  const [user] = await db
    .select({
      currentStreak: users.currentStreak,
      longestStreak: users.longestStreak,
      lastLogDate: users.lastLogDate,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { currentStreak: 0, longestStreak: 0, forgiven: false };
  }

  // Forgiveness is derived from the log history, so the window of dates that
  // could hold an already-spent forgiveness has to come with it.
  const history = await db
    .select({ date: dailyLogs.date })
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.userId, userId),
        gte(dailyLogs.date, windowStart(logDate))
      )
    );

  const result = resolveStreak({
    currentStreak: user.currentStreak ?? 0,
    longestStreak: user.longestStreak ?? 0,
    lastLogDate: user.lastLogDate,
    logDate,
    recentLogDates: history.map((row) => row.date),
  });

  if (result.changed) {
    await db
      .update(users)
      .set({
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
        lastLogDate: logDate,
      })
      .where(eq(users.id, userId));
  }

  return {
    currentStreak: result.currentStreak,
    longestStreak: result.longestStreak,
    forgiven: result.forgiven,
  };
}

/** Oldest YYYY-MM-DD date that still falls inside the forgiveness window. */
function windowStart(logDate: string): string {
  const start = new Date(Date.parse(logDate + "T00:00:00Z"));
  // Two extra days: a forgiveness that resumed just inside the window has its
  // preceding log up to two days earlier, and the pair is what identifies it.
  start.setUTCDate(start.getUTCDate() - FORGIVENESS_WINDOW_DAYS - 2);
  return start.toISOString().split("T")[0];
}
