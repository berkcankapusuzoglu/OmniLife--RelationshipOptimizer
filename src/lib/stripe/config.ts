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
  priceType: "monthly" | "yearly"
): string {
  if (priceType === "monthly") {
    return process.env.STRIPE_MONTHLY_PRICE_ID ?? "";
  }
  return process.env.STRIPE_YEARLY_PRICE_ID ?? "";
}
