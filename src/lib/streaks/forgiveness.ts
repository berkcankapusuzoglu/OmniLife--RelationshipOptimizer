/**
 * Streak forgiveness: one missed day per rolling 30 days does not break a streak.
 *
 * Nothing is stored to track it. A used forgiveness is derivable from the log
 * history itself — an exactly-one-day gap between two logs is, by definition,
 * a day that was forgiven — so no schema column is needed and existing streaks
 * stay valid without a migration.
 *
 * Pure functions only: every date arrives as a YYYY-MM-DD argument.
 */

/** Rolling window, in days, in which a single forgiveness may be used. */
export const FORGIVENESS_WINDOW_DAYS = 30;

/** Returns the number of calendar days between two YYYY-MM-DD strings. */
export function dayDifference(dateA: string, dateB: string): number {
  // Parsed as UTC midnight so DST transitions cannot shift the quotient.
  const a = Date.parse(dateA + "T00:00:00Z");
  const b = Date.parse(dateB + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

/**
 * The most recent date on which a forgiveness was spent — the resume date of a
 * single-day gap — within the window ending at `asOfDate`, or null if none.
 */
export function lastForgivenessDate(
  logDates: readonly string[],
  asOfDate: string
): string | null {
  // Dates at or after `asOfDate` are excluded: callers persist the log row
  // before updating the streak, so the date being logged now is already in the
  // history. Counting it would make the current gap look like an
  // already-spent forgiveness and no gap would ever be forgiven.
  const sorted = [...new Set(logDates)].filter((date) => date < asOfDate).sort();

  for (let i = sorted.length - 1; i > 0; i -= 1) {
    const resumedOn = sorted[i];
    if (dayDifference(resumedOn, asOfDate) >= FORGIVENESS_WINDOW_DAYS) break;
    if (dayDifference(sorted[i - 1], resumedOn) === 2) return resumedOn;
  }

  return null;
}

export interface StreakInput {
  currentStreak: number;
  longestStreak: number;
  /** Last date the user logged, or null if they never have. */
  lastLogDate: string | null;
  /** The date being logged now. */
  logDate: string;
  /** Prior log dates, at least the last 30 days' worth, in any order. */
  recentLogDates: readonly string[];
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  /** False when the caller should skip the write (same-day or backdated log). */
  changed: boolean;
  /** True when this log only survived because a missed day was forgiven. */
  forgiven: boolean;
}

export function resolveStreak(input: StreakInput): StreakResult {
  const { currentStreak, longestStreak, lastLogDate, logDate } = input;
  const unchanged = { currentStreak, longestStreak, changed: false, forgiven: false };

  if (!lastLogDate) {
    return { currentStreak: 1, longestStreak: Math.max(longestStreak, 1), changed: true, forgiven: false };
  }

  const gap = dayDifference(lastLogDate, logDate);

  // A same-day or backdated log must never rewind an in-progress streak.
  if (gap <= 0) return unchanged;

  let next: number;
  let forgiven = false;

  if (gap === 1) {
    next = currentStreak + 1;
  } else if (gap === 2 && lastForgivenessDate(input.recentLogDates, logDate) === null) {
    // Exactly one missed day and the window's forgiveness is unspent: the
    // missed day is skipped rather than counted, so the streak keeps growing.
    next = currentStreak + 1;
    forgiven = true;
  } else {
    next = 1;
  }

  return {
    currentStreak: next,
    longestStreak: Math.max(longestStreak, next),
    changed: true,
    forgiven,
  };
}
