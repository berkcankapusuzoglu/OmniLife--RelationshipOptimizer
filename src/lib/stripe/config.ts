// Required environment variables for Stripe integration.
// Add these to .env.local:
//
// STRIPE_SECRET_KEY=sk_test_...
// STRIPE_WEBHOOK_SECRET=whsec_...
// STRIPE_MONTHLY_PRICE_ID=price_...
// STRIPE_YEARLY_PRICE_ID=price_...
// NEXT_PUBLIC_APP_URL=http://localhost:3000

export function getAppUrl(): string {
  // NEXT_PUBLIC_ vars are embedded at build time in client bundles but may not
  // be available as runtime env vars in server functions — use NEXT_PUBLIC_APP_URL
  // with a fallback to the known production URL.
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "https://omnilife-relationship-optimizer.vercel.app"
  );
}

export function getStripePriceId(
  priceType: "monthly" | "yearly",
  tier: "pro" | "premium" = "premium"
): string {
  if (tier === "pro") {
    // Pro-specific price IDs — fall back to premium price IDs if not configured yet
    if (priceType === "monthly") {
      return process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? process.env.STRIPE_MONTHLY_PRICE_ID ?? "";
    }
    return process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? process.env.STRIPE_YEARLY_PRICE_ID ?? "";
  }
  if (priceType === "monthly") {
    return process.env.STRIPE_MONTHLY_PRICE_ID ?? "";
  }
  return process.env.STRIPE_YEARLY_PRICE_ID ?? "";
}
