import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeUpgradeButton } from "@/components/native-upgrade-button";
import { PremiumGate } from "@/components/premium-gate";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { PricingClient, type PricingEntitlement } from "@/app/(public)/pricing/pricing-client";
import PricingPage from "@/app/(public)/pricing/page";
import LandingClient from "@/app/(public)/landing-client";
import { ExercisesClient } from "@/app/(dashboard)/exercises/exercises-client";
import { TIERS } from "@/lib/subscription/tiers";

/**
 * Native billing policy.
 *
 * Flag off (`NATIVE_BILLING_ENABLED` unset — every client shipped before
 * v1.1.0 and any deployment with the flag down): the Android app must show no
 * price, no purchase control and no link to web checkout.
 * Flag on: the only purchase surface is the store-priced RevenueCat paywall;
 * web prices are never rendered on native and the Stripe portal is never
 * reachable from the app.
 */

const platform = vi.hoisted(() => ({ native: true, server: false }));
const auth = vi.hoisted(() => ({ user: null as { id: string; subscriptionTier: string } | null }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => platform.native, getPlatform: () => platform.native ? "android" : "web" } }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown, serverSnapshot: () => unknown) => platform.server ? serverSnapshot() : snapshot() };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/guard", () => ({ getCurrentUser: async () => auth.user }));
vi.mock("@/lib/subscription/access", () => ({
  getUserTier: async () => "free",
  getEntitlement: async (id: string) => ({ tier: "free", via: "none", expiresAt: null, source: null, ownerId: id }),
}));
vi.mock("@/lib/revenuecat/sync", () => ({ syncRevenueCatEntitlement: vi.fn() }));
vi.mock("@/app/(dashboard)/exercises/actions", () => ({ completeExercise: vi.fn() }));
vi.mock("@/lib/recommendations/engine", () => ({
  getRecommendedExercises: () => Array.from({ length: 6 }, (_, i) => ({
    id: `exercise-${i}`, title: `Exercise ${i}`, description: "Guided practice",
    category: "emotional", durationMinutes: 5, targetDimensions: ["emotional"],
    theoryBasis: "Communication practice", instructions: ["Listen"], difficulty: "easy",
  })),
}));

function html(node: React.ReactNode) { return renderToStaticMarkup(node); }
function visibleText(markup: string) {
  return markup.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]*>/g, "");
}
/** No price, no purchase or management control, no route to web checkout. */
function expectNoBilling(markup: string) {
  expect(visibleText(markup)).not.toMatch(/\$|Upgrade|Go Pro|Go Premium|Manage Subscription|Compare Plans|free trial|upgrade when/i);
  expect(markup).not.toMatch(/href="[^\"]*(?:pricing|checkout|stripe)/i);
}
/** Web prices and Stripe routes stay out of native markup even with the flag on. */
function expectNoWebPricing(markup: string) {
  expect(visibleText(markup)).not.toMatch(/\$|4\.99|24\.99|Go Pro|Go Premium|Compare Plans/i);
  expect(markup).not.toMatch(/href="[^\"]*(?:pricing|checkout|stripe)/i);
}
function entitlement(via: PricingEntitlement["via"], source: PricingEntitlement["source"] = null): PricingEntitlement {
  return { tier: via === "none" ? "free" : "premium", via, source, ownerId: via === "partner" ? "partner-user" : "test-user", expiresAt: null };
}

beforeEach(() => {
  platform.native = true; platform.server = false;
  auth.user = { id: "test-user", subscriptionTier: "free" };
  vi.stubGlobal("React", React);
  vi.stubEnv("NATIVE_BILLING_ENABLED", "");
});

describe("native billing policy with the flag off (pre-1.1.0 clients and disabled deployments)", () => {
  it("suppresses a native purchase button including its price-bearing children", () => {
    expectNoBilling(html(<NativeUpgradeButton tier="premium" interval="monthly">Upgrade $4.99</NativeUpgradeButton>));
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
  it("keeps the actual exercise-limit prompt neutral on native", () => {
    const markup = html(<ExercisesClient currentScores={null} recentExerciseIds={[]} userTier="free" />);
    expect(markup).toContain(`${TIERS.free.features.exerciseLimit} of 6 exercises`);
    expectNoBilling(markup);
  });
  it.each(["free", "pro", "premium"])("makes native direct pricing safe for %s users", async (tier) => {
    expectNoBilling(html(<PricingClient currentTier={tier} userId="test-user" />));
    expectNoBilling(html(await PricingPage()));
  });
  it("keeps landing-page native navigation free of paid offers", () => {
    expectNoBilling(html(<LandingClient />));
  });
  it("ignores a stale nativeBilling prop when the client is not native", () => {
    platform.native = false;
    const markup = html(<PricingClient currentTier="free" userId="test-user" nativeBilling />);
    expect(markup).not.toMatch(/Loading plans|Google Play|Restore purchases/);
    expect(markup).toContain("Go Premium");
  });
});

describe("native billing policy with the flag on", () => {
  beforeEach(() => { vi.stubEnv("NATIVE_BILLING_ENABLED", "true"); });

  it("shows only the store-priced paywall to a signed-in free user", () => {
    const markup = html(<PricingClient currentTier="free" userId="test-user" nativeBilling entitlement={entitlement("none")} />);
    expect(markup).toContain("One subscription covers both linked partners");
    // The paywall loads its prices from the store after mount; the first paint has none.
    expect(markup).toContain("Loading plans");
    expectNoWebPricing(markup);
    expect(markup).not.toMatch(/Manage Subscription/);
  });
  it("renders the same flag-on paywall from the server pricing page", async () => {
    const markup = html(await PricingPage());
    expect(markup).toContain("Loading plans");
    expectNoWebPricing(markup);
  });
  it("asks anonymous native visitors to sign in instead of selling", () => {
    const markup = html(<PricingClient currentTier="free" nativeBilling />);
    expect(markup).toContain("Sign in to subscribe");
    expect(markup).not.toContain("Loading plans");
    expectNoWebPricing(markup);
  });
  it("gives store subscribers Play management and restore, never the Stripe portal", () => {
    const markup = html(<PricingClient currentTier="premium" userId="test-user" nativeBilling entitlement={entitlement("own", "revenuecat")} />);
    expect(markup).toContain("Manage Subscription");
    expect(markup).toContain("Restore purchases");
    expect(markup).not.toContain("Loading plans");
    expectNoWebPricing(markup);
  });
  it("points web (Stripe) subscribers to the web instead of opening the portal", () => {
    const markup = html(<PricingClient currentTier="premium" userId="test-user" nativeBilling entitlement={entitlement("own", "stripe")} />);
    expect(markup).toContain("Manage your subscription on the web");
    expect(markup).not.toContain("Manage Subscription");
    expectNoWebPricing(markup);
    expect(html(<ManageSubscriptionButton source="stripe" productId={null} />)).toContain("Manage your subscription on the web");
  });
  it("tells a covered partner nothing is for sale", () => {
    const markup = html(<PricingClient currentTier="premium" userId="test-user" nativeBilling entitlement={entitlement("partner")} />);
    expect(markup).toMatch(/included with your partner/i);
    expect(markup).not.toMatch(/Loading plans|Manage Subscription|Restore purchases/);
    expectNoWebPricing(markup);
  });
  it("keeps feature locks and prompts free of web prices on native", () => {
    expectNoWebPricing(html(<PremiumGate userTier="free" feature="insights"><p>Insight chart</p></PremiumGate>));
    expectNoWebPricing(html(<UpgradePrompt featureDescription="Personalized coaching" />));
    expectNoWebPricing(html(<NativeUpgradeButton tier="premium" interval="yearly">Go Premium $24.99</NativeUpgradeButton>));
  });
});

describe("hydration safety and the ordinary web", () => {
  it("renders no billing offers before hydration knows the platform", () => {
    platform.server = true;
    platform.native = false;
    expectNoBilling(html(<PricingClient currentTier="premium" />));
    expectNoBilling(html(<PricingClient currentTier="free" userId="test-user" nativeBilling />));
    expectNoBilling(html(<PremiumGate userTier="free" feature="insights">Chart</PremiumGate>));
    expectNoBilling(html(<UpgradePrompt featureDescription="Coaching" />));
    expectNoBilling(html(<NativeUpgradeButton tier="premium" interval="monthly" />));
  });
  it("preserves ordinary web pricing, checkout controls, and subscription management", () => {
    platform.native = false;
    const free = html(<PricingClient currentTier="free" />);
    expect(free).toContain("$");
    expect(free).not.toContain("Go Pro");
    expect(free).toContain("Go Premium");
    expect(free).toContain("7-day free trial, covers both partners");
    expect(html(<PricingClient currentTier="premium" />)).toContain("Manage Subscription");
    const legacy = html(<PricingClient currentTier="pro" />);
    expect(legacy).toContain("Legacy Pro");
    expect(legacy).toContain("Manage Subscription");
    expect(legacy).not.toContain("Go Pro");
    expect(html(<PremiumGate userTier="free" feature="insights">Chart</PremiumGate>)).toContain('href="/pricing"');
    expect(html(<ManageSubscriptionButton source="stripe" productId={null} />)).toContain("Manage Subscription");
  });
  it("shows current web offers without unsupported trial or price-lock promises", () => {
    platform.native = false;
    const landing = html(<LandingClient />);
    expect(landing).toContain(`$${TIERS.premium.monthlyPrice}`);
    expect(landing).toContain(TIERS.free.featureList[3]);
    expect(landing).toContain(TIERS.premium.featureList[1].replace(/&/g, "&amp;"));
    expect(landing).not.toMatch(/free trial|lock in|before it increases/i);
    const prompt = html(<UpgradePrompt featureDescription="Guided exercises" />);
    expect(prompt).toContain(`$${TIERS.premium.monthlyPrice}/mo`);
    expect(prompt).not.toMatch(/free trial|\$7\.99/i);
  });
});
