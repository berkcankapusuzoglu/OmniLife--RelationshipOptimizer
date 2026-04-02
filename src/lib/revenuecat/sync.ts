/**
 * Server-side RevenueCat sync utilities.
 * Calls the RevenueCat REST API to get subscriber info and updates the DB.
 *
 * Environment variable required:
 *   REVENUECAT_SECRET_KEY   — secret key from RevenueCat dashboard (Projects → API Keys)
 */

"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { SubscriptionTier } from "@/lib/subscription/tiers";

// Map RevenueCat entitlement IDs → app tier names.
// Configure matching entitlement IDs in the RevenueCat dashboard.
const ENTITLEMENT_TO_TIER: Record<string, SubscriptionTier> = {
  premium: "premium",
  pro: "pro",
};

interface RCEntitlement {
  expires_date: string | null;
  product_identifier: string;
}

interface RCSubscriberResponse {
  subscriber: {
    entitlements: Record<string, RCEntitlement>;
  };
}

/**
 * Fetches the subscriber record from RevenueCat and updates the user's
 * subscriptionTier and subscriptionExpiresAt in the database.
 *
 * Called after a successful native purchase to ensure the DB reflects
 * the latest entitlement state.
 */
export async function syncRevenueCatEntitlement(userId: string): Promise<void> {
  const secretKey = process.env.REVENUECAT_SECRET_KEY;
  if (!secretKey) {
    console.warn("[RevenueCat] REVENUECAT_SECRET_KEY not set — skipping sync");
    return;
  }

  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      // No caching — always fetch fresh entitlement state
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.error(`[RevenueCat] subscriber fetch failed: ${res.status}`);
    return;
  }

  const data: RCSubscriberResponse = await res.json();
  const activeEntitlements = data.subscriber.entitlements;

  // Determine the highest active tier
  let resolvedTier: SubscriptionTier = "free";
  let expiresAt: Date | null = null;

  for (const [entitlementId, entitlement] of Object.entries(activeEntitlements)) {
    const tier = ENTITLEMENT_TO_TIER[entitlementId];
    if (!tier) continue;

    const expiry = entitlement.expires_date
      ? new Date(entitlement.expires_date)
      : null;

    // Treat null expiry as active (lifetime / no expiry set)
    const isActive = !expiry || expiry > new Date();
    if (!isActive) continue;

    // Prefer premium over pro
    if (tier === "premium") {
      resolvedTier = "premium";
      expiresAt = expiry;
      break;
    }
    if (tier === "pro" && (resolvedTier as SubscriptionTier) !== "premium") {
      resolvedTier = "pro";
      expiresAt = expiry;
    }
  }

  const db = getDb();
  await db
    .update(users)
    .set({
      subscriptionTier: resolvedTier,
      subscriptionExpiresAt: expiresAt ?? undefined,
    })
    .where(eq(users.id, userId));
}
