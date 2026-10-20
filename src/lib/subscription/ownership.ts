import { and, eq, isNull, lt, lte, or } from "drizzle-orm";
import { users } from "@/lib/db/schema";

/** A paid grant may renew its owner or claim an explicitly free unowned row.
 * Paid legacy rows with unknown ownership require operator reconciliation.
 */
export function canGrantSubscription(provider: "stripe" | "revenuecat") {
  return or(
    eq(users.subscriptionSource, provider),
    and(isNull(users.subscriptionSource), eq(users.subscriptionTier, "free")),
  );
}

/** An owned RevenueCat period may only move forward; equal/older periods are replays. */
export function revenueCatCanAdvance(expiresAt: Date) {
  return and(eq(users.subscriptionSource, "revenuecat"), lt(users.subscriptionExpiresAt, expiresAt));
}

/** Only an explicitly free, unowned row can be claimed by a new RevenueCat grant. */
export function revenueCatCanClaim() {
  return and(isNull(users.subscriptionSource), eq(users.subscriptionTier, "free"));
}

/** Finite RevenueCat periods may advance, but cannot replay/regress a period. */
export function canAdvanceRevenueCat(expiresAt: Date) {
  return or(revenueCatCanAdvance(expiresAt), revenueCatCanClaim());
}

/** Revocation only touches a RevenueCat-owned row whose period has elapsed by `now`.
 * A null (lifetime/unknown) expiry never satisfies this; stripe/manual rows are untouched.
 */
export function revenueCatExpiredBefore(now: Date) {
  return and(eq(users.subscriptionSource, "revenuecat"), lte(users.subscriptionExpiresAt, now));
}
