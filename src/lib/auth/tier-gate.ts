import { getUserTier } from "@/lib/subscription/access";
import {
  SELLABLE_TIERS,
  TIERS,
  type Features,
  type SubscriptionTier,
} from "@/lib/subscription/tiers";

export interface FeatureAccessResult {
  allowed: boolean;
  requiredTier: string;
}

function tierAllows(tier: SubscriptionTier, feature: keyof Features): boolean {
  const value = TIERS[tier].features[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

/**
 * Server-side gating function that checks whether a user's effective tier
 * (own, trial, or inherited from a linked partner) grants access to a feature.
 * `requiredTier` only ever names a sellable tier — legacy `pro` is readable
 * but never advertised as the upgrade path.
 */
export async function hasFeatureAccess(
  userId: string,
  feature: keyof Features
): Promise<FeatureAccessResult> {
  const userTier = await getUserTier(userId);
  const allowed = tierAllows(userTier, feature);

  let requiredTier = "free";
  if (!allowed) {
    requiredTier =
      SELLABLE_TIERS.find((tier) => tierAllows(tier, feature)) ??
      SELLABLE_TIERS[0];
  }

  return { allowed, requiredTier };
}
