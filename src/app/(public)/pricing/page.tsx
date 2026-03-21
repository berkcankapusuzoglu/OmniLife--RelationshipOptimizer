import type { Metadata } from "next";
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

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Start free. Upgrade when you&apos;re ready.
        </p>
      </div>
      <PricingClient currentTier="free" />
    </div>
  );
}
