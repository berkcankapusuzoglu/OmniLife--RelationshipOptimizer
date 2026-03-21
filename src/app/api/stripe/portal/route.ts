import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/stripe/config";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer found. Please subscribe first." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
