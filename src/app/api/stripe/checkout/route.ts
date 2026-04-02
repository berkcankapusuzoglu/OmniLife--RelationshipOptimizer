import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAppUrl, getStripePriceId } from "@/lib/stripe/config";
import { getSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const priceType = body.priceType as "monthly" | "yearly";

  if (priceType !== "monthly" && priceType !== "yearly") {
    return NextResponse.json(
      { error: "Invalid priceType. Must be 'monthly' or 'yearly'." },
      { status: 400 }
    );
  }

  const priceId = getStripePriceId(priceType);
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price ID not configured" },
      { status: 500 }
    );
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
      client_reference_id: session.userId,
    });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("Stripe checkout error:", message, "appUrl:", appUrl, "priceId:", priceId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
