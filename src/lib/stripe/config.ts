// Required environment variables for Stripe integration.
// Add these to .env.local:
//
// STRIPE_SECRET_KEY=sk_test_...
// STRIPE_WEBHOOK_SECRET=whsec_...
// STRIPE_MONTHLY_PRICE_ID=price_...
// STRIPE_YEARLY_PRICE_ID=price_...
// NEXT_PUBLIC_APP_URL=http://localhost:3000

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getStripePriceId(
  priceType: "monthly" | "yearly"
): string {
  if (priceType === "monthly") {
    return process.env.STRIPE_MONTHLY_PRICE_ID ?? "";
  }
  return process.env.STRIPE_YEARLY_PRICE_ID ?? "";
}
