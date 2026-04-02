/**
 * RevenueCat webhook handler.
 *
 * Configure in RevenueCat dashboard:
 *   Project → Integrations → Webhooks → Add endpoint
 *   URL: https://omnilife-relationship-optimizer.vercel.app/api/revenuecat/webhook
 *   Authorization: <value of REVENUECAT_WEBHOOK_SECRET>
 *
 * Events handled: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { SubscriptionTier } from "@/lib/subscription/tiers";

// Map RevenueCat product_id → tier
const PRODUCT_TO_TIER: Record<string, SubscriptionTier> = {
  pro_monthly: "pro",
  pro_yearly: "pro",
  premium_monthly: "premium",
  premium_yearly: "premium",
};

interface RCWebhookEvent {
  type: string;
  app_user_id: string;
  product_id: string;
  expiration_at_ms?: number | null;
}

interface RCWebhookBody {
  event: RCWebhookEvent;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Validate Authorization header
  const authHeader = req.headers.get("Authorization");
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[RevenueCat webhook] REVENUECAT_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (authHeader !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RCWebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event } = body;
  if (!event?.type || !event?.app_user_id) {
    return NextResponse.json({ error: "Missing event fields" }, { status: 400 });
  }

  const { type, app_user_id: userId, product_id: productId, expiration_at_ms } = event;

  try {
    const db = getDb();

    if (type === "INITIAL_PURCHASE" || type === "RENEWAL") {
      const tier = PRODUCT_TO_TIER[productId];
      if (!tier) {
        console.warn(`[RevenueCat webhook] Unknown product_id: ${productId}`);
        return NextResponse.json({ received: true });
      }

      const expiresAt = expiration_at_ms ? new Date(expiration_at_ms) : null;

      await db
        .update(users)
        .set({
          subscriptionTier: tier,
          subscriptionExpiresAt: expiresAt ?? undefined,
        })
        .where(eq(users.id, userId));

      console.log(`[RevenueCat webhook] ${type}: ${userId} → ${tier}`);
    } else if (type === "CANCELLATION" || type === "EXPIRATION") {
      await db
        .update(users)
        .set({
          subscriptionTier: "free",
          subscriptionExpiresAt: undefined,
        })
        .where(eq(users.id, userId));

      console.log(`[RevenueCat webhook] ${type}: ${userId} → free`);
    } else {
      // Ignored event types: UNCANCELLATION, BILLING_ISSUE, PRODUCT_CHANGE, etc.
      console.log(`[RevenueCat webhook] Ignored event type: ${type}`);
    }
  } catch (err) {
    console.error("[RevenueCat webhook] DB error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
