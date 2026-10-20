/**
 * RevenueCat reconciliation (server-only).
 *
 * The RevenueCat REST subscriber record is the single source of truth for
 * native entitlements. Webhook events and client sync requests only name the
 * app user to reconcile; they never carry state into the database.
 *
 * Environment variable required:
 *   REVENUECAT_SECRET_KEY — secret key from RevenueCat dashboard (Projects → API Keys)
 */

import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { SubscriptionTier } from "@/lib/subscription/tiers";
import {
  revenueCatCanAdvance,
  revenueCatCanClaim,
  revenueCatExpiredBefore,
} from "@/lib/subscription/ownership";

export const ENTITLEMENT_ID = "premium";

/** Store product identifier → app tier (reference for clients and operators;
 * `pro_*` are legacy, no longer sold). Grants are decided by entitlement id. */
export const PRODUCT_IDS = {
  premium_monthly: "premium",
  premium_yearly: "premium",
  pro_monthly: "pro",
  pro_yearly: "pro",
} as const;

// Entitlement identifier → app tier. `pro` stays readable for legacy grants.
const ENTITLEMENT_TIERS: Record<string, SubscriptionTier> = {
  [ENTITLEMENT_ID]: "premium",
  pro: "pro",
};

export interface RCEntitlement {
  expires_date: string | null;
  purchase_date?: string | null;
  product_identifier: string;
  grace_period_expires_date?: string | null;
}

export interface RCSubscription {
  expires_date: string | null;
  purchase_date?: string | null;
  /** "normal" | "trial" | "intro" */
  period_type?: string | null;
  store?: string | null;
  billing_issues_detected_at?: string | null;
  grace_period_expires_date?: string | null;
  refunded_at?: string | null;
  unsubscribe_detected_at?: string | null;
  auto_resume_date?: string | null;
}

export interface RCSubscriber {
  entitlements: Record<string, RCEntitlement>;
  subscriptions?: Record<string, RCSubscription>;
}

export interface ResolvedEntitlement {
  tier: SubscriptionTier;
  expiresAt: Date | null;
  productId: string | null;
  trialEndsAt: Date | null;
  billingIssue: boolean;
}

export type ReconcileResult = "granted" | "advanced" | "expired" | "unchanged" | "skipped-unowned";

const TIER_RANK: Record<SubscriptionTier, number> = { free: 0, pro: 1, premium: 2 };

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function latest(...dates: Array<Date | null>): Date | null {
  return dates.reduce<Date | null>((max, date) => (date && (!max || date > max) ? date : max), null);
}

/**
 * GET /v1/subscribers/{appUserId}. Returns null when RevenueCat has no such
 * subscriber (404). Throws on a missing key, non-2xx responses and network errors
 * so callers can distinguish "nothing to apply" from "could not find out".
 */
export async function fetchSubscriber(appUserId: string): Promise<RCSubscriber | null> {
  const secretKey = process.env.REVENUECAT_SECRET_KEY;
  if (!secretKey) throw new Error("REVENUECAT_SECRET_KEY is not set");

  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "X-Platform": "android",
      },
      cache: "no-store",
    },
  );

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`RevenueCat subscriber fetch failed: ${res.status}`);

  const data = (await res.json()) as { subscriber?: RCSubscriber };
  return data.subscriber ?? { entitlements: {}, subscriptions: {} };
}

/**
 * Pure projection of a subscriber record onto the app's billing columns.
 * The highest active known entitlement wins. Grace periods extend expiry;
 * refunds end access regardless of the entitlement's date. A lifetime
 * entitlement resolves with a null expiry and is never written (no lifecycle evidence).
 */
export function resolveFromSubscriber(subscriber: RCSubscriber, now: Date): ResolvedEntitlement {
  const free: ResolvedEntitlement = { tier: "free", expiresAt: null, productId: null, trialEndsAt: null, billingIssue: false };
  let best: ResolvedEntitlement | null = null;

  for (const [entitlementId, entitlement] of Object.entries(subscriber.entitlements ?? {})) {
    // The entitlement identifier is the authority; unknown entitlements grant nothing.
    const tier = ENTITLEMENT_TIERS[entitlementId];
    if (!tier) continue;
    const productId = entitlement.product_identifier ?? null;

    const subscription = productId ? subscriber.subscriptions?.[productId] : undefined;
    if (subscription?.refunded_at) continue;

    const expiresAt = latest(
      parseDate(entitlement.expires_date),
      parseDate(entitlement.grace_period_expires_date),
      parseDate(subscription?.grace_period_expires_date),
    );
    const lifetime = entitlement.expires_date == null;
    if (!lifetime && (!expiresAt || expiresAt <= now)) continue;

    const candidate: ResolvedEntitlement = {
      tier,
      expiresAt: lifetime ? null : expiresAt,
      productId,
      trialEndsAt: subscription?.period_type === "trial" && !lifetime ? expiresAt : null,
      billingIssue: Boolean(subscription?.billing_issues_detected_at),
    };
    if (!best || TIER_RANK[tier] > TIER_RANK[best.tier]) best = candidate;
  }

  return best ?? free;
}

/**
 * Reconciles one app user from RevenueCat's REST record. Every write is guarded
 * by an ownership predicate evaluated at write time: stripe/manual rows and
 * paid legacy rows with unknown ownership are never touched.
 */
export async function reconcileRevenueCatUser(
  appUserId: string,
  opts: { now?: Date } = {},
): Promise<ReconcileResult> {
  const now = opts.now ?? new Date();
  const subscriber = await fetchSubscriber(appUserId);
  if (!subscriber) return "unchanged";

  const resolved = resolveFromSubscriber(subscriber, now);
  const db = getDb();

  if (resolved.tier === "free") {
    const revoked = await db
      .update(users)
      .set({
        subscriptionTier: "free",
        subscriptionSource: null,
        subscriptionExpiresAt: null,
        billingProductId: null,
        billingTrialEndsAt: null,
      })
      .where(and(eq(users.id, appUserId), revenueCatExpiredBefore(now)))
      .returning({ id: users.id });
    return revoked.length > 0 ? "expired" : "unchanged";
  }

  // A lifetime/unknown period cannot establish monotonic lifecycle ordering.
  if (!resolved.expiresAt) return "unchanged";

  const grant = {
    subscriptionTier: resolved.tier,
    subscriptionSource: "revenuecat" as const,
    subscriptionExpiresAt: resolved.expiresAt,
    billingProductId: resolved.productId,
    billingTrialEndsAt: resolved.trialEndsAt,
  };

  const advanced = await db
    .update(users)
    .set(grant)
    .where(and(eq(users.id, appUserId), revenueCatCanAdvance(resolved.expiresAt)))
    .returning({ id: users.id });
  if (advanced.length > 0) return "advanced";

  const granted = await db
    .update(users)
    .set(grant)
    .where(and(eq(users.id, appUserId), revenueCatCanClaim()))
    .returning({ id: users.id });
  if (granted.length > 0) return "granted";

  // Nothing was written. Classify only (this read guards no write): an owned row
  // already at or past this period is a replay; anything else is not ours.
  const [current] = await db
    .select({ subscriptionSource: users.subscriptionSource })
    .from(users)
    .where(eq(users.id, appUserId))
    .limit(1);
  return current?.subscriptionSource === "revenuecat" ? "unchanged" : "skipped-unowned";
}
