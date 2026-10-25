// Reward curve for referrals. Pure: no db, no clock.

// Published on /refer. `months` is the cumulative Premium time a referrer holds
// once that many referrals have been rewarded, so copy and grants cannot drift.
export const REFERRAL_TIERS = [
  { referrals: 1, months: 1 },
  { referrals: 3, months: 3 },
  { referrals: 5, months: 6 },
] as const;

const BONUS_AT = 5;
const DAYS_PER_MONTH = 30;

export function cumulativeRewardMonths(rewardedCount: number): number {
  if (rewardedCount <= 0) return 0;
  return rewardedCount + (rewardedCount >= BONUS_AT ? 1 : 0);
}

export function rewardMonthsForNthReferral(n: number): number {
  if (n <= 0) return 0;
  return cumulativeRewardMonths(n) - cumulativeRewardMonths(n - 1);
}

// Legacy rows left at `signed_up` were granted one month each by the pre-tier
// code and never the bonus, so they are counted flat.
export function earnedMonths(counts: { signedUp: number; rewarded: number }): number {
  return cumulativeRewardMonths(counts.rewarded) + Math.max(counts.signedUp, 0);
}

// Days of Premium trial a grant of `months` adds. The grant itself is applied
// in SQL against the row's current value, so this stays pure arithmetic.
export function trialExtensionDays(months: number): number {
  if (months <= 0) return 0;
  return months * DAYS_PER_MONTH;
}
