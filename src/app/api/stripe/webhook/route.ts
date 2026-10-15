import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { canGrantSubscription } from "@/lib/subscription/ownership";
import { getStripeTierForPriceId } from "@/lib/stripe/config";
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
      { error: "Webhook unavailable" },
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

  async function revokePendingCheckout(subscription: Stripe.Subscription) {
    const token = subscription.metadata?.checkoutToken;
    const userId = subscription.metadata?.appUserId;
    if (!token || !userId) return;
    await db.update(users).set({ stripePendingCheckoutToken: null, stripePendingCheckoutSessionId: null })
      .where(and(eq(users.id, userId), eq(users.stripePendingCheckoutToken, token)));
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (!userId || session.mode !== "subscription" ||
        (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")) break;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      const purchasedTier = session.metadata?.tier;
      const checkoutToken = session.metadata?.checkoutToken;
      if (!subscriptionId || !customerId || !session.id || !checkoutToken || (purchasedTier !== "pro" && purchasedTier !== "premium")) break;

      await db
        .update(users)
        .set({
          subscriptionTier: purchasedTier,
          subscriptionSource: "stripe",
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripePendingCheckoutToken: null,
          stripePendingCheckoutSessionId: null,
          subscriptionExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(users.id, userId), canGrantSubscription("stripe"),
          eq(users.stripePendingCheckoutToken, checkoutToken),
          eq(users.stripePendingCheckoutSessionId, session.id),
        ));
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const status = subscription.status;
      const priceId = subscription.items?.data?.[0]?.price?.id ?? "";
      const tier =
        status === "active" || status === "trialing"
          ? getStripeTierForPriceId(priceId)
          : "free";
      // Unknown/ambiguous prices cannot grant a default Premium entitlement.
      if (!tier) {
        console.warn("Stripe subscription price is not mapped to an entitlement");
        break;
      }
      const expiresAt =
        subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

      const isDowngrade = tier === "free";
      if (isDowngrade) await revokePendingCheckout(subscription);
      await db
        .update(users)
        .set({
          subscriptionTier: tier,
          // Keep the subscription owner through recoverable payment failures.
          // Deletion clears ownership; a later active update can restore access.
          subscriptionSource: "stripe",
          subscriptionExpiresAt: isDowngrade ? null : expiresAt,
          updatedAt: new Date(),
        })
        .where(and(
          eq(users.stripeCustomerId, customerId),
          eq(users.stripeSubscriptionId, subscription.id),
          eq(users.subscriptionSource, "stripe"),
        ));
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await revokePendingCheckout(subscription);
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      await db
        .update(users)
        .set({
          subscriptionTier: "free",
          subscriptionSource: null,
          stripeSubscriptionId: null,
          subscriptionExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(users.stripeCustomerId, customerId),
          eq(users.stripeSubscriptionId, subscription.id),
          eq(users.subscriptionSource, "stripe"),
        ));
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
