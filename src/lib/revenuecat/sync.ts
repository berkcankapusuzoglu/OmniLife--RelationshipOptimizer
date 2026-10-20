/**
 * Server action: reconcile the signed-in user's RevenueCat entitlement.
 *
 * The native paywall calls this after a purchase/restore so access updates
 * without waiting for the webhook. State comes from RevenueCat's REST record
 * (see reconcile.ts); the client supplies nothing but its session.
 */

"use server";

import { requireAuth } from "@/lib/auth/guard";
import { reconcileRevenueCatUser, type ReconcileResult } from "@/lib/revenuecat/reconcile";

export async function syncRevenueCatEntitlement(): Promise<ReconcileResult> {
  const user = await requireAuth();
  try {
    return await reconcileRevenueCatUser(user.id);
  } catch (err) {
    // Misconfiguration or a RevenueCat outage must not break the page; the
    // webhook retries independently, and the user can restore again later.
    console.error("[RevenueCat] sync failed:", err);
    return "unchanged";
  }
}
