import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn(
        "STRIPE_SECRET_KEY is not set — Stripe calls will fail at runtime"
      );
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-12-18.acacia",
    });
  }
  return _stripe;
}
