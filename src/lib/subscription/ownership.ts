import { and, eq, isNull, lt, or } from "drizzle-orm";
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

/** Finite RevenueCat periods may advance, but cannot replay/regress a period. */
export function canAdvanceRevenueCat(expiresAt: Date) {
  return or(
    and(eq(users.subscriptionSource, "revenuecat"), lt(users.subscriptionExpiresAt, expiresAt)),
    and(isNull(users.subscriptionSource), eq(users.subscriptionTier, "free")),
  );
}
