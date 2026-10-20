import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/guard";
import { getEntitlement } from "@/lib/subscription/access";
import { nativeBillingEnabled } from "@/lib/billing/flags";
import { PricingClient, type PricingEntitlement } from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing — Couplemetric",
  description:
    "Simple, transparent pricing. Start free, upgrade when you're ready.",
  openGraph: {
    title: "Pricing — Couplemetric",
    description:
      "Simple, transparent pricing. Start free, upgrade when you're ready.",
    images: [
      {
        url: "/api/og?life=78&rel=82&total=80&date=2026-03-21",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const params = (await searchParams) ?? {};
  // Upgrade CTAs deep-link here with `?plan=premium` so the plan is preselected.
  const preselectPlan = params.plan === "premium" ? "premium" : null;
  const user = await getCurrentUser();
  // Plain data only: the client receives the entitlement as serializable fields.
  let entitlement: PricingEntitlement | null = null;
  if (user) {
    const resolved = await getEntitlement(user.id);
    entitlement = {
      tier: resolved.tier,
      via: resolved.via,
      source: resolved.source,
      ownerId: resolved.ownerId,
      expiresAt: resolved.expiresAt ? new Date(resolved.expiresAt).toISOString() : null,
    };
  }
  const currentTier = entitlement?.tier ?? "free";

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <PricingClient
        currentTier={currentTier}
        userId={user?.id}
        nativeBilling={nativeBillingEnabled()}
        entitlement={entitlement}
        preselectPlan={preselectPlan}
      />
    </div>
  );
}
