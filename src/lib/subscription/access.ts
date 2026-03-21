import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { TIERS, type SubscriptionTier, type Features } from "./tiers";

export async function getUserTier(
  userId: string
): Promise<SubscriptionTier> {
  const db = getDb();
  const [user] = await db
    .select({
      subscriptionTier: users.subscriptionTier,
      subscriptionExpiresAt: users.subscriptionExpiresAt,
      trialEndsAt: users.trialEndsAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return "free";

  // Check if premium subscription is still active
  if (user.subscriptionTier === "premium") {
    if (
      user.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt) < new Date()
    ) {
      return "free"; // expired
    }
    return "premium";
  }

  // Check if trial is still active
  if (user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) {
    return "premium";
  }

  return "free";
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
