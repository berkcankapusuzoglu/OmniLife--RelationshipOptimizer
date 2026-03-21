import { getUserTier } from "@/lib/subscription/access";
import { TIERS, type Features } from "@/lib/subscription/tiers";

export interface FeatureAccessResult {
  allowed: boolean;
  requiredTier: string;
}

/**
 * Server-side gating function that checks whether a user's subscription tier
 * grants access to a specific feature.
 */
export async function hasFeatureAccess(
  userId: string,
  feature: keyof Features
): Promise<FeatureAccessResult> {
  const userTier = await getUserTier(userId);
  const config = TIERS[userTier].features;
  const value = config[feature];

  let allowed = false;
  if (typeof value === "boolean") {
    allowed = value;
  } else if (typeof value === "number") {
    allowed = value > 0;
  }

  // Determine the minimum tier that grants this feature
  let requiredTier = "free";
  if (!allowed) {
    // Check which tier first grants access
    for (const [tierKey, tierConfig] of Object.entries(TIERS)) {
      const tierValue = tierConfig.features[feature];
      const tierAllows =
        typeof tierValue === "boolean" ? tierValue : (tierValue as number) > 0;
      if (tierAllows) {
        requiredTier = tierKey;
        break;
      }
    }
  }

  return { allowed, requiredTier };
}
