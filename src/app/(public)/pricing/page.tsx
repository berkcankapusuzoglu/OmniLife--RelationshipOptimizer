import { PricingClient } from "./pricing-client";

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
