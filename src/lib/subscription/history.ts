import { TIERS, type SubscriptionTier } from "./tiers";

/** Earliest allowed date for all-time history (legacy unlimited tiers). */
const ALL_TIME_CUTOFF = "1970-01-01";

function daysAgo(days: number, now: Date): string {
  if (!Number.isFinite(days)) return ALL_TIME_CUTOFF;
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff.toISOString().split("T")[0];
}

/**
 * Returns the oldest `YYYY-MM-DD` date (no timezone) a tier may read.
 * Derived from `TIERS[tier].features.historyDays` so page queries can never
 * drift from the feature matrix.
 */
export function historyCutoff(tier: SubscriptionTier, now: Date = new Date()): string {
  return daysAgo(TIERS[tier].features.historyDays, now);
}

/** Same as `historyCutoff` but for the partner comparison window (`compareDays`). */
export function compareCutoff(tier: SubscriptionTier, now: Date = new Date()): string {
  return daysAgo(TIERS[tier].features.compareDays, now);
}

/** Rolling-week window start used to count exercise completions. */
export function weeklyWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
}

/**
 * Exercises a user may still complete in the rolling 7-day window.
 * `Infinity` for tiers with an unlimited exercise library.
 */
export function exercisesRemainingThisWeek(tier: SubscriptionTier, completedLast7Days: number): number {
  const limit = TIERS[tier].features.exerciseLimit;
  if (!Number.isFinite(limit)) return Infinity;
  return Math.max(0, limit - completedLast7Days);
}
