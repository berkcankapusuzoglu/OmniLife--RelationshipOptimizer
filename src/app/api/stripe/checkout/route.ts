import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getStripePriceId } from "@/lib/stripe/config";
import { getCurrentUser } from "@/lib/auth/guard";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { canGrantSubscription } from "@/lib/subscription/ownership";
import { getEntitlement } from "@/lib/subscription/access";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Effective access (own → trial → partner → free), not the raw stored tier: a
  // partner-covered account must not buy a second subscription for the couple.
  const entitlement = await getEntitlement(user.id);
  if (entitlement.via === "partner") {
    return NextResponse.json({ error: "Premium is already included through your partner's plan." }, { status: 409 });
  }
  const paid = entitlement.via === "own";
  if ((user.subscriptionSource && user.subscriptionSource !== "stripe") || (paid && entitlement.source !== "stripe")) {
    return NextResponse.json({ error: "Account access needs review before checkout." }, { status: 409 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("tier" in body) || !("priceType" in body)) {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }
  const { priceType, tier } = body;
  // Only Premium is sold on the web (v1.1.0). Legacy Pro stays readable but is not purchasable.
  if (tier !== "premium") {
    return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 });
  }

  if (priceType !== "monthly" && priceType !== "yearly") {
    return NextResponse.json(
      { error: "Invalid priceType. Must be 'monthly' or 'yearly'." },
      { status: 400 }
    );
  }

  let priceId: string;
  try {
    priceId = getStripePriceId(priceType, tier);
  } catch (err) {
    console.error("Stripe price config error:", err);
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
  }

  // Derive app URL from the incoming request to avoid env var issues
  const origin = request.headers.get("origin") ?? request.headers.get("x-forwarded-host");
  const appUrl = origin?.startsWith("http")
    ? origin
    : `https://${origin ?? "couplemetric.app"}`;

  try {
    const db = getDb();
    const checkoutToken = randomUUID();
    const reserved = await db.update(users).set({
      stripePendingCheckoutToken: checkoutToken,
      stripePendingCheckoutSessionId: null,
    }).where(and(eq(users.id, user.id), canGrantSubscription("stripe"))).returning({ id: users.id });
    if (!reserved.length) return NextResponse.json({ error: "Account access changed. Please try again." }, { status: 409 });

    const stripe = getStripe();
    // A 7-day trial mirrors the Play offer, but only for first-time Stripe customers.
    // Returning customers reuse their Stripe customer and get no second trial.
    const returningCustomer = user.stripeCustomerId ?? null;
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/overview?upgraded=true`,
      cancel_url: `${appUrl}/pricing`,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      ...(returningCustomer ? { customer: returningCustomer } : {}),
      metadata: { tier, checkoutToken },
      subscription_data: {
        metadata: { checkoutToken, appUserId: user.id },
        ...(returningCustomer ? {} : { trial_period_days: 7 }),
      },
    });
    const bound = await db.update(users).set({ stripePendingCheckoutSessionId: checkoutSession.id })
      .where(and(eq(users.id, user.id), eq(users.stripePendingCheckoutToken, checkoutToken), canGrantSubscription("stripe")))
      .returning({ id: users.id });
    if (!bound.length) {
      await stripe.checkout.sessions.expire(checkoutSession.id).catch(() => {});
      return NextResponse.json({ error: "Checkout was superseded. Please try again." }, { status: 409 });
    }
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
  }
}
