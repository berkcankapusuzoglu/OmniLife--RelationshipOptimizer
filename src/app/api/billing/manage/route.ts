import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getEntitlement } from "@/lib/subscription/access";

const ANDROID_PACKAGE = "app.couplemetric.android";

/**
 * Describes how the signed-in user's access is managed, so clients can route
 * "Manage Subscription" to the right place without guessing. A partner-covered
 * user is told who owns the plan and gets no management URL of their own.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entitlement = await getEntitlement(user.id);
  let productId: string | null = null;
  if (entitlement.via === "own") {
    const [owner] = await getDb()
      .select({ billingProductId: users.billingProductId })
      .from(users)
      .where(eq(users.id, entitlement.ownerId))
      .limit(1);
    productId = owner?.billingProductId ?? null;
  }

  let manageUrl: string | null = null;
  if (entitlement.via === "own" && entitlement.source === "revenuecat") {
    const url = new URL("https://play.google.com/store/account/subscriptions");
    if (productId) url.searchParams.set("sku", productId);
    url.searchParams.set("package", ANDROID_PACKAGE);
    manageUrl = url.toString();
  }

  return NextResponse.json({
    tier: entitlement.tier,
    via: entitlement.via,
    source: entitlement.via === "own" ? entitlement.source : null,
    productId,
    expiresAt: entitlement.expiresAt ? entitlement.expiresAt.toISOString() : null,
    manageUrl,
  });
}
