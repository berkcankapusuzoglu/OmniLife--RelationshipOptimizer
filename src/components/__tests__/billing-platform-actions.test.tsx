import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeUpgradeButton } from "@/components/native-upgrade-button";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { PricingClient } from "@/app/(public)/pricing/pricing-client";
import { SettingsClient } from "@/app/(dashboard)/settings/settings-client";

/**
 * Platform-specific billing actions.
 * Web: Stripe checkout (Premium only) and the Stripe portal.
 * Native, flag off: no purchase or management control at all.
 * Native, flag on: store subscribers manage through Google Play (Browser
 * plugin), web subscribers get a neutral note, nobody reaches the Stripe
 * portal. The full paywall/restore state machine lives in native-billing.test.tsx.
 */

const platform = vi.hoisted(() => ({ native: false }));
const push = vi.hoisted(() => vi.fn());
const browserOpen = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => platform.native, getPlatform: () => (platform.native ? "android" : "web") } }));
vi.mock("@capacitor/browser", () => ({ Browser: { open: browserOpen } }));
// Inspect the returned element tree and invoke real handlers without a DOM renderer.
vi.mock("react", async importOriginal => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (value: unknown) => [typeof value === "function" ? (value as () => unknown)() : value, () => {}],
  useEffect: () => {},
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/app/(dashboard)/settings/actions", () => ({ updateProfile: vi.fn(), updateWeights: vi.fn(), exportData: vi.fn() }));
vi.mock("@/lib/auth/actions", () => ({ logoutAction: vi.fn() }));
vi.mock("@/lib/revenuecat/sync", () => ({ syncRevenueCatEntitlement: vi.fn() }));
vi.mock("@/lib/revenuecat/client", () => ({
  configureRevenueCat: vi.fn(async () => true),
  loadOffering: vi.fn(async () => ({ error: "no-offering" })),
  purchase: vi.fn(), restore: vi.fn(async () => ({ active: false })),
  managementUrl: vi.fn(async () => null),
}));
vi.mock("@/app/(public)/delete-account/delete-account-client", () => ({ DeleteAccountClient: () => null }));

type ElementProps = { children?: React.ReactNode; onClick?: () => Promise<void> | void };
function elements(node: React.ReactNode): React.ReactElement<ElementProps>[] {
  const result: React.ReactElement<ElementProps>[] = [];
  React.Children.forEach(node, child => {
    if (React.isValidElement<ElementProps>(child)) {
      result.push(child, ...elements(child.props.children));
    }
  });
  return result;
}
function control(node: React.ReactNode, label: string) {
  return elements(node).find(element => React.Children.toArray(element.props.children).includes(label) && element.props.onClick)?.props.onClick;
}
/** The billing tab's card subtree (Tabs only renders the active panel statically). */
function billingPanel(tree: React.ReactNode): React.ReactNode {
  // Both the trigger and the panel carry value="billing"; the panel's children are elements.
  return elements(tree).find(element => (element.props as { value?: string }).value === "billing" && typeof element.props.children !== "string")?.props.children;
}
/** Invoke the ManageSubscriptionButton element inside a tree so its handler becomes visible. */
function manageButton(tree: React.ReactNode): React.ReactNode {
  const element = elements(tree).find(e => e.type === ManageSubscriptionButton);
  return element ? ManageSubscriptionButton(element.props as Parameters<typeof ManageSubscriptionButton>[0]) : null;
}
const weights = { alpha: 0.5, beta: 0.5, pillar: { vitality: 0.25, growth: 0.25, security: 0.25, connection: 0.25 }, rel: { emotional: 0.2, trust: 0.2, fairness: 0.2, stress: 0.2, autonomy: 0.2 } };
type Billing = NonNullable<Parameters<typeof SettingsClient>[0]["billing"]>;
function settings(tier: string, billing?: Billing) {
  return SettingsClient({ user: { id: "test-user", name: "Test", email: "test@example.test", subscriptionTier: tier, subscriptionExpiresAt: null, stripeCustomerId: "cus_test" }, billing, weights });
}
function own(source: Billing["source"], nativeBilling = true): Billing {
  return { via: "own", source, productId: source === "revenuecat" ? "premium_yearly" : null, partnerName: null, nativeBilling };
}

beforeEach(() => {
  push.mockReset(); browserOpen.mockClear();
  platform.native = false;
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", { location: { href: "" } });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ url: "https://checkout.example.test/session" }) })));
});

describe("web", () => {
  it("sends the Premium Stripe checkout payload and follows the redirect", async () => {
    const onClick = control(NativeUpgradeButton({ tier: "premium", interval: "yearly" }), "Go Premium");
    expect(onClick).toBeTypeOf("function");
    await onClick!();
    expect(fetch).toHaveBeenCalledWith("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"priceType":"yearly","tier":"premium"}' });
    expect(window.location.href).toBe("https://checkout.example.test/session");
  });
  it("sends an anonymous web purchaser to registration without an unsupported return parameter", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: "Unauthorized" }) })));
    await control(NativeUpgradeButton({ tier: "premium", interval: "monthly" }), "Go Premium")!();
    expect(push).toHaveBeenCalledWith("/register");
    expect(window.location.href).toBe("");
  });
  it("opens the Stripe portal from direct pricing, settings and the shared button", async () => {
    await control(PricingClient({ currentTier: "premium" }), "Manage Subscription")!();
    await control(settings("premium"), "Manage Subscription")!();
    await control(ManageSubscriptionButton({ source: "stripe", productId: null }), "Manage Subscription")!();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenCalledWith("/api/stripe/portal", { method: "POST" });
    expect(window.location.href).toBe("https://checkout.example.test/session");
    expect(browserOpen).not.toHaveBeenCalled();
  });
});

describe("native with the billing flag off", () => {
  beforeEach(() => { platform.native = true; });
  it.each(["free", "pro", "premium"])("renders no purchase or management control in settings for %s", tier => {
    expect(control(settings(tier), "Upgrade")).toBeUndefined();
    expect(control(settings(tier), "Manage Subscription")).toBeUndefined();
    expect(control(settings(tier, own("revenuecat", false)), "Manage Subscription")).toBeUndefined();
    expect(renderToStaticMarkup(billingPanel(settings(tier, own("revenuecat", false))))).not.toMatch(/Restore purchases|Loading plans|Manage Subscription|Upgrade/);
  });
  it("rechecks the native bridge before stale web controls can request checkout or portal", async () => {
    platform.native = false;
    const checkout = control(NativeUpgradeButton({ tier: "premium", interval: "monthly" }), "Go Premium");
    const pricingPortal = control(PricingClient({ currentTier: "premium" }), "Manage Subscription");
    const settingsPortal = control(settings("premium"), "Manage Subscription");
    const settingsUpgrade = control(settings("free"), "Upgrade");
    const sharedPortal = control(ManageSubscriptionButton({ source: "stripe", productId: null }), "Manage Subscription");
    platform.native = true;
    await checkout!(); await pricingPortal!(); await settingsPortal!(); await settingsUpgrade!(); await sharedPortal!();
    expect(fetch).not.toHaveBeenCalled();
    expect(window.location.href).toBe("");
    expect(browserOpen).not.toHaveBeenCalled();
  });
});

describe("native with the billing flag on", () => {
  beforeEach(() => { platform.native = true; });
  it("manages a store subscription through Google Play in the system browser", async () => {
    const tree = manageButton(settings("premium", own("revenuecat")));
    expect(tree).not.toBeNull();
    await control(tree, "Manage Subscription")!();
    expect(browserOpen).toHaveBeenCalledWith({ url: "https://play.google.com/store/account/subscriptions?sku=premium_yearly&package=app.couplemetric.android" });
    expect(fetch).not.toHaveBeenCalled();
    expect(window.location.href).toBe("");
  });
  it("never opens the Stripe portal for a web subscription viewed in the app", async () => {
    const tree = manageButton(settings("premium", own("stripe")));
    expect(control(tree, "Manage Subscription")).toBeUndefined();
    expect(renderToStaticMarkup(billingPanel(settings("premium", own("stripe"))))).toContain("Manage your subscription on the web");
    const shared = ManageSubscriptionButton({ source: "stripe", productId: null });
    expect(control(shared, "Manage Subscription")).toBeUndefined();
    expect(renderToStaticMarkup(shared)).toContain("Manage your subscription on the web");
    expect(renderToStaticMarkup(shared)).not.toMatch(/stripe|portal|href=/i);
    expect(fetch).not.toHaveBeenCalled();
    expect(browserOpen).not.toHaveBeenCalled();
  });
  it("shows the store paywall, not web checkout, to a free user in settings", () => {
    const markup = renderToStaticMarkup(billingPanel(settings("free", { via: "none", source: null, productId: null, partnerName: null, nativeBilling: true })));
    expect(markup).not.toMatch(/\$|Upgrade|Go Premium|checkout|stripe/i);
    expect(markup).toMatch(/Loading plans|Plans are not available yet/);
    expect(control(settings("free", { via: "none", source: null, productId: null, partnerName: null, nativeBilling: true }), "Upgrade")).toBeUndefined();
  });
  it("offers a covered partner nothing to buy or manage", () => {
    const markup = renderToStaticMarkup(billingPanel(settings("premium", { via: "partner", source: null, productId: null, partnerName: "Alex", nativeBilling: true })));
    expect(markup).toContain("Included with Alex");
    expect(markup).not.toMatch(/\$|Manage Subscription|Restore purchases|Loading plans|Go Premium/);
  });
});
