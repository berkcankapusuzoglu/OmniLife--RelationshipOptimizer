import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/guard";
import { getUserTier } from "@/lib/subscription/access";
import { PricingClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing — OmniLife",
  description:
    "Simple, transparent pricing. Start free, upgrade when you're ready.",
  openGraph: {
    title: "Pricing — OmniLife",
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

export default async function PricingPage() {
  const user = await getCurrentUser();
  const currentTier = user ? await getUserTier(user.id) : "free";

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <PricingClient currentTier={currentTier} userId={user?.id} />
    </div>
  );
}
