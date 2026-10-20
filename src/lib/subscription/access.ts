import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { TIERS, type SubscriptionTier, type Features } from "./tiers";

export type EntitlementSource = "stripe" | "revenuecat" | "manual";

export interface Entitlement {
  tier: SubscriptionTier;
  /** How the tier was obtained. `partner` = inherited from a reciprocally linked partner (couple plan). */
  via: "own" | "partner" | "trial" | "none";
  expiresAt: Date | null;
  source: EntitlementSource | null;
  /** The user whose subscription grants the tier (self unless `via === "partner"`). */
  ownerId: string;
}

const PAID_TIERS: ReadonlySet<string> = new Set(["pro", "premium"]);

function activePaidTier(
  tier: string | null,
  expiresAt: Date | null,
  now: Date
): SubscriptionTier | null {
  if (!tier || !PAID_TIERS.has(tier)) return null;
  if (expiresAt && new Date(expiresAt) < now) return null;
  return tier as SubscriptionTier;
}

function asSource(source: string | null): EntitlementSource | null {
  return source === "stripe" || source === "revenuecat" || source === "manual"
    ? source
    : null;
}

/**
 * Resolves a user's effective entitlement without any stored couple-plan state.
 * Priority: own paid & unexpired → own trial → reciprocally linked partner's
 * paid & unexpired subscription → free. Never writes.
 */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  const db = getDb();
  const partner = alias(users, "partner");
  const [row] = await db
    .select({
      subscriptionTier: users.subscriptionTier,
      subscriptionSource: users.subscriptionSource,
      subscriptionExpiresAt: users.subscriptionExpiresAt,
      trialEndsAt: users.trialEndsAt,
      partnerId: partner.id,
      partnerTier: partner.subscriptionTier,
      partnerSource: partner.subscriptionSource,
      partnerExpiresAt: partner.subscriptionExpiresAt,
    })
    .from(users)
    .leftJoin(
      partner,
      and(eq(partner.id, users.partnerId), eq(partner.partnerId, users.id))
    )
    .where(eq(users.id, userId))
    .limit(1);

  const none: Entitlement = { tier: "free", via: "none", expiresAt: null, source: null, ownerId: userId };
  if (!row) return none;

  const now = new Date();

  const own = activePaidTier(row.subscriptionTier, row.subscriptionExpiresAt, now);
  if (own) {
    return {
      tier: own,
      via: "own",
      expiresAt: row.subscriptionExpiresAt ?? null,
      source: asSource(row.subscriptionSource),
      ownerId: userId,
    };
  }

  if (row.trialEndsAt && new Date(row.trialEndsAt) > now) {
    return { tier: "premium", via: "trial", expiresAt: row.trialEndsAt, source: null, ownerId: userId };
  }

  const inherited = row.partnerId
    ? activePaidTier(row.partnerTier, row.partnerExpiresAt, now)
    : null;
  if (inherited && row.partnerId) {
    return {
      tier: inherited,
      via: "partner",
      expiresAt: row.partnerExpiresAt ?? null,
      source: asSource(row.partnerSource),
      ownerId: row.partnerId,
    };
  }

  return none;
}

export async function getUserTier(
  userId: string
): Promise<SubscriptionTier> {
  return (await getEntitlement(userId)).tier;
}

export function canAccess(
  tier: SubscriptionTier,
  feature: keyof Features
): boolean {
  const config = TIERS[tier].features;
  const value = config[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

export function getFeatureLimits(tier: SubscriptionTier) {
  return TIERS[tier].features;
}
