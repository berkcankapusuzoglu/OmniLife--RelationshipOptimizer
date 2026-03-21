import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Update streak after a daily log submission.
 * Returns the updated streak values.
 */
export async function updateStreak(
  userId: string,
  logDate: string
): Promise<{ currentStreak: number; longestStreak: number }> {
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
    return { currentStreak: 0, longestStreak: 0 };
  }

  const lastDate = user.lastLogDate;
  let newStreak = user.currentStreak ?? 0;

  if (lastDate === logDate) {
    // Already logged today — no change
    return {
      currentStreak: newStreak,
      longestStreak: user.longestStreak ?? 0,
    };
  }

  if (lastDate) {
    const diff = dayDifference(lastDate, logDate);
    if (diff === 1) {
      // Consecutive day
      newStreak += 1;
    } else {
      // Gap > 1 day — reset
      newStreak = 1;
    }
  } else {
    // First log ever
    newStreak = 1;
  }

  const newLongest = Math.max(user.longestStreak ?? 0, newStreak);

  await db
    .update(users)
    .set({
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastLogDate: logDate,
    })
    .where(eq(users.id, userId));

  return { currentStreak: newStreak, longestStreak: newLongest };
}

/** Returns the number of calendar days between two YYYY-MM-DD strings. */
function dayDifference(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T00:00:00Z");
  const b = new Date(dateB + "T00:00:00Z");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
