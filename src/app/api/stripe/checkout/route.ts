import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getStripePriceId } from "@/lib/stripe/config";
import { getCurrentUser } from "@/lib/auth/guard";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paid = user.subscriptionTier === "pro" || user.subscriptionTier === "premium";
  if ((user.subscriptionSource && user.subscriptionSource !== "stripe") || (paid && user.subscriptionSource !== "stripe")) {
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
  if (tier !== "pro" && tier !== "premium") {
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
    : `https://${origin ?? "omnilife-relationship-optimizer.vercel.app"}`;

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/overview?upgraded=true`,
      cancel_url: `${appUrl}/pricing`,
      client_reference_id: user.id,
      metadata: { tier },
    });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
  }
}
