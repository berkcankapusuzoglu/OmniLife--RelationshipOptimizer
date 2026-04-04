import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const db = getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (!userId) break;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      // Read tier from metadata (set at checkout creation); default to "premium"
      const purchasedTier =
        session.metadata?.tier === "pro" ? "pro" : "premium";

      await db
        .update(users)
        .set({
          subscriptionTier: purchasedTier,
          stripeCustomerId: customerId ?? null,
          stripeSubscriptionId: subscriptionId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const status = subscription.status;
      // Determine tier from price ID: pro price IDs get "pro", otherwise "premium"
      const proMonthlyId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
      const proYearlyId = process.env.STRIPE_PRO_YEARLY_PRICE_ID;
      const priceId = subscription.items?.data?.[0]?.price?.id ?? "";
      const isProPrice = !!priceId && (priceId === proMonthlyId || priceId === proYearlyId);
      const tier =
        status === "active" || status === "trialing"
          ? isProPrice
            ? "pro"
            : "premium"
          : "free";
      const expiresAt =
        subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

      await db
        .update(users)
        .set({
          subscriptionTier: tier,
          subscriptionExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(users.stripeCustomerId, customerId));
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      await db
        .update(users)
        .set({
          subscriptionTier: "free",
          stripeSubscriptionId: null,
          subscriptionExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.stripeCustomerId, customerId));
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn(
        `Payment failed for customer ${invoice.customer}, invoice ${invoice.id}`
      );
      break;
    }

    default:
      // Return 200 for unhandled events
      break;
  }

  return NextResponse.json({ received: true });
}
