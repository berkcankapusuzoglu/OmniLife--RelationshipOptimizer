import { and, eq, isNull, or } from "drizzle-orm";
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
