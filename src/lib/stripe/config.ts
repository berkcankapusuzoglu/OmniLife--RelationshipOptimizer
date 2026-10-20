// Stripe mirrors the store catalogue: only Premium is sold on the web
// (STRIPE_PREMIUM_MONTHLY_PRICE_ID / STRIPE_PREMIUM_YEARLY_PRICE_ID).
// Legacy Pro and pre-1.1.0 Premium price ids stay resolvable so existing
// subscriptions keep renewing on their original tier.
// Secret keys and price IDs are server-only runtime configuration.

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ??
    "https://omnilife-relationship-optimizer.vercel.app";
}

type StripeTier = "pro" | "premium";
type Interval = "monthly" | "yearly";

const premiumVariables: Record<Interval, { current: string; legacyAlias: string }> = {
  // The un-prefixed names are the pre-1.1.0 Premium ids; accepted as aliases for one release.
  monthly: { current: "STRIPE_PREMIUM_MONTHLY_PRICE_ID", legacyAlias: "STRIPE_MONTHLY_PRICE_ID" },
  yearly: { current: "STRIPE_PREMIUM_YEARLY_PRICE_ID", legacyAlias: "STRIPE_YEARLY_PRICE_ID" },
};

// Legacy ids per tier: comma lists plus the pre-1.1.0 single-id env names.
const legacyVariables: Record<StripeTier, { list: string; singles: string[] }> = {
  pro: { list: "STRIPE_LEGACY_PRO_PRICE_IDS", singles: ["STRIPE_PRO_MONTHLY_PRICE_ID", "STRIPE_PRO_YEARLY_PRICE_ID"] },
  premium: { list: "STRIPE_LEGACY_PREMIUM_PRICE_IDS", singles: Object.values(premiumVariables).map(v => v.legacyAlias) },
};

function readId(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readList(name: string): string[] {
  return (process.env[name] ?? "").split(",").map(id => id.trim()).filter(Boolean);
}

function currentPremiumPriceId(interval: Interval): string | undefined {
  const { current, legacyAlias } = premiumVariables[interval];
  return readId(current) ?? readId(legacyAlias);
}

function priceIdsForTier(tier: StripeTier): Set<string> {
  const ids = new Set<string>(readList(legacyVariables[tier].list));
  for (const name of legacyVariables[tier].singles) { const id = readId(name); if (id) ids.add(id); }
  if (tier === "premium") {
    for (const interval of Object.keys(premiumVariables) as Interval[]) {
      const id = currentPremiumPriceId(interval); if (id) ids.add(id);
    }
  }
  return ids;
}

/** Maps any known current or legacy price id to its tier; unknown or ambiguous ids are null. */
export function getStripeTierForPriceId(priceId: string): StripeTier | null {
  if (!priceId) return null;
  const tiers = (["pro", "premium"] as const).filter(tier => priceIdsForTier(tier).has(priceId));
  return tiers.length === 1 ? tiers[0] : null;
}

/** The price to sell. Only Premium is purchasable; Pro is legacy-readable but never sold. */
export function getStripePriceId(priceType: Interval, tier: StripeTier = "premium"): string {
  if (tier !== "premium") {
    throw new Error(`Stripe tier is no longer purchasable: ${tier}`);
  }
  const priceId = currentPremiumPriceId(priceType);
  if (!priceId || getStripeTierForPriceId(priceId) !== "premium") {
    throw new Error(`Missing or ambiguous Stripe price configuration: ${premiumVariables[priceType].current}`);
  }
  return priceId;
}
