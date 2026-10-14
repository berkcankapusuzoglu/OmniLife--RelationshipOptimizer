import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeUpgradeButton } from "@/components/native-upgrade-button";
import { PremiumGate } from "@/components/premium-gate";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { PricingClient } from "@/app/(public)/pricing/pricing-client";
import PricingPage from "@/app/(public)/pricing/page";
import LandingClient from "@/app/(public)/landing-client";

const platform = vi.hoisted(() => ({ native: true, server: false }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => platform.native, getPlatform: () => platform.native ? "android" : "web" } }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown, serverSnapshot: () => unknown) => platform.server ? serverSnapshot() : snapshot() };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/guard", () => ({ getCurrentUser: async () => ({ id: "test-user", subscriptionTier: "free" }) }));
vi.mock("@/lib/revenuecat/sync", () => ({ syncRevenueCatEntitlement: vi.fn() }));

function html(node: React.ReactNode) { return renderToStaticMarkup(node); }
function expectNoBilling(markup: string) {
  const visibleText = markup.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]*>/g, "");
  expect(visibleText).not.toMatch(/\$|Upgrade|Go Pro|Go Premium|Manage Subscription|Compare Plans|free trial|upgrade when/i);
  expect(markup).not.toMatch(/href="[^\"]*(?:pricing|checkout|stripe)/i);
}

describe("free native release purchase surfaces", () => {
  beforeEach(() => { platform.native = true; platform.server = false; vi.stubGlobal("React", React); });

  it("suppresses a native purchase button including its price-bearing children", () => {
    expectNoBilling(html(<NativeUpgradeButton tier="pro" interval="monthly">Upgrade $3.99</NativeUpgradeButton>));
  });
  it("locks unavailable native features without purchase directions", () => {
    const markup = html(<PremiumGate userTier="free" feature="insights"><p>Insight chart</p></PremiumGate>);
    expectNoBilling(markup);
    expect(markup).toMatch(/not available|unavailable/i);
  });
  it.each(["pro", "premium"])("honors existing %s native entitlements", (tier) => {
    const markup = html(<PremiumGate userTier={tier} feature="insights"><p>Insight chart</p></PremiumGate>);
    expect(markup).toBe("<p>Insight chart</p>");
  });
  it("uses neutral native locked copy in upgrade prompts", () => {
    const markup = html(<UpgradePrompt featureDescription="Personalized coaching" />);
    expectNoBilling(markup);
    expect(markup).toContain("Personalized coaching");
  });
  it.each(["free", "pro", "premium"])("makes native direct pricing safe for %s users", async (tier) => {
    expectNoBilling(html(<PricingClient currentTier={tier} userId="test-user" />));
    expectNoBilling(html(await PricingPage()));
  });
  it("keeps landing-page native navigation free of paid offers", () => {
    expectNoBilling(html(<LandingClient />));
  });
  it("renders no billing offers before hydration knows the platform", () => {
    platform.server = true;
    platform.native = false;
    expectNoBilling(html(<PricingClient currentTier="premium" />));
    expectNoBilling(html(<PremiumGate userTier="free" feature="insights">Chart</PremiumGate>));
    expectNoBilling(html(<UpgradePrompt featureDescription="Coaching" />));
    expectNoBilling(html(<NativeUpgradeButton tier="pro" interval="monthly" />));
  });
  it("preserves ordinary web pricing, checkout controls, and subscription management", () => {
    platform.native = false;
    const free = html(<PricingClient currentTier="free" />);
    expect(free).toContain("$");
    expect(free).toContain("Go Pro");
    expect(free).toContain("Go Premium");
    expect(html(<PricingClient currentTier="premium" />)).toContain("Manage Subscription");
    expect(html(<PremiumGate userTier="free" feature="insights">Chart</PremiumGate>)).toContain('href="/pricing"');
  });
});
