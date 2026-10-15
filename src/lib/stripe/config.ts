// Pro and Premium require distinct Stripe price IDs for each offered interval.
// Secret keys and price IDs are server-only runtime configuration.

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ??
    "https://omnilife-relationship-optimizer.vercel.app";
}

const priceVariables = {
  pro: { monthly: "STRIPE_PRO_MONTHLY_PRICE_ID", yearly: "STRIPE_PRO_YEARLY_PRICE_ID" },
  premium: { monthly: "STRIPE_MONTHLY_PRICE_ID", yearly: "STRIPE_YEARLY_PRICE_ID" },
} as const;

export function getStripeTierForPriceId(priceId: string): "pro" | "premium" | null {
  if (!priceId) return null;
  const tiers = (["pro", "premium"] as const).filter(tier =>
    Object.values(priceVariables[tier]).some(name => process.env[name]?.trim() === priceId),
  );
  return tiers.length === 1 ? tiers[0] : null;
}

export function getStripePriceId(
  priceType: "monthly" | "yearly",
  tier: "pro" | "premium" = "premium",
): string {
  const variable = priceVariables[tier][priceType];
  const priceId = process.env[variable]?.trim();
  if (!priceId || getStripeTierForPriceId(priceId) !== tier) {
    throw new Error(`Missing or ambiguous Stripe price configuration: ${variable}`);
  }
  return priceId;
}
