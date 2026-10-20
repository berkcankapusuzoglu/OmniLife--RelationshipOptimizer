/**
 * RevenueCat webhook handler.
 *
 * Configure in RevenueCat dashboard:
 *   Project → Integrations → Webhooks → Add endpoint
 *   URL: https://<app host>/api/revenuecat/webhook
 *   Authorization: <value of REVENUECAT_WEBHOOK_SECRET>
 *
 * Event fields are never trusted for state. Every handled event names one or
 * more app user ids, and each is reconciled from the RevenueCat REST record
 * (src/lib/revenuecat/reconcile.ts). Delivery is idempotent by `event.id`
 * through the billing_events ledger; a failed reconcile releases the id and
 * returns 500 so RevenueCat retries.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { billingEvents } from "@/lib/db/schema";
import { isAccountId, reconcileRevenueCatUser, type ReconcileResult } from "@/lib/revenuecat/reconcile";

const RECONCILED_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
  "PRODUCT_CHANGE",
  "TRANSFER",
  "SUBSCRIBER_ALIAS",
]);

interface RCWebhookEvent {
  id?: unknown;
  type?: unknown;
  app_user_id?: unknown;
  original_app_user_id?: unknown;
  transferred_from?: unknown;
  transferred_to?: unknown;
  aliases?: unknown;
}

function ids(...values: unknown[]): string[] {
  const out = new Set<string>();
  for (const value of values) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === "string" && item.length > 0) out.add(item);
    }
  }
  return [...out];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("Authorization");
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[RevenueCat webhook] REVENUECAT_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (authHeader !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event?: RCWebhookEvent };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event: RCWebhookEvent = body?.event ?? {};
  const eventId = typeof event.id === "string" ? event.id : null;
  const type = typeof event.type === "string" ? event.type : null;
  if (!eventId || !type) {
    return NextResponse.json({ error: "Missing event fields" }, { status: 400 });
  }

  if (!RECONCILED_EVENTS.has(type)) {
    console.log(`[RevenueCat webhook] Ignored event type: ${type}`);
    return NextResponse.json({ received: true, ignored: type });
  }

  const named =
    type === "TRANSFER"
      ? ids(event.transferred_from, event.transferred_to, event.app_user_id)
      : type === "SUBSCRIBER_ALIAS"
        ? ids(event.app_user_id, event.original_app_user_id, event.aliases)
        : ids(event.app_user_id);
  if (named.length === 0) {
    return NextResponse.json({ error: "Missing event fields" }, { status: 400 });
  }
  // Only UUIDs can name an account row (users.id is uuid); anonymous/legacy ids are skipped without a fetch.
  const targets = named.filter(isAccountId);

  const db = getDb();

  let claimed: Array<{ id: string }>;
  try {
    claimed = await db
      .insert(billingEvents)
      .values({ id: eventId, provider: "revenuecat" })
      .onConflictDoNothing()
      .returning({ id: billingEvents.id });
  } catch (err) {
    console.error("[RevenueCat webhook] Ledger error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
  if (claimed.length === 0) {
    return NextResponse.json({ duplicate: true });
  }

  const results: Record<string, ReconcileResult> = {};
  try {
    for (const appUserId of targets) {
      results[appUserId] = await reconcileRevenueCatUser(appUserId);
    }
  } catch (err) {
    console.error(`[RevenueCat webhook] Reconcile failed for ${type} ${eventId}:`, err);
    try {
      await db.delete(billingEvents).where(eq(billingEvents.id, eventId));
    } catch (releaseErr) {
      console.error("[RevenueCat webhook] Could not release event id:", releaseErr);
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true, results });
}
