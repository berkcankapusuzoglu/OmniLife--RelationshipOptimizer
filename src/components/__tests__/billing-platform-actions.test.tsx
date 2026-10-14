import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { NativeUpgradeButton } from "@/components/native-upgrade-button";
import { PricingClient } from "@/app/(public)/pricing/pricing-client";
import { SettingsClient } from "@/app/(dashboard)/settings/settings-client";

const platform = vi.hoisted(() => ({ native: false }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => platform.native } }));
// Inspect the returned element tree and invoke real handlers without a DOM renderer.
vi.mock("react", async importOriginal => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (value: unknown) => [value, () => {}],
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/(dashboard)/settings/actions", () => ({ updateProfile: vi.fn(), updateWeights: vi.fn(), exportData: vi.fn() }));
vi.mock("@/lib/auth/actions", () => ({ logoutAction: vi.fn() }));
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
const weights = { alpha: 0.5, beta: 0.5, pillar: { vitality: 0.25, growth: 0.25, security: 0.25, connection: 0.25 }, rel: { emotional: 0.2, trust: 0.2, fairness: 0.2, stress: 0.2, autonomy: 0.2 } };
function settings(tier: string) {
  return SettingsClient({ user: { id: "test-user", name: "Test", email: "test@example.test", subscriptionTier: tier, subscriptionExpiresAt: null, stripeCustomerId: "cus_test" }, weights });
}

beforeEach(() => {
  platform.native = false;
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", { location: { href: "" } });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ url: "https://checkout.example.test/session" }) })));
});
it.each(["free", "pro", "premium"])("removes native settings purchase and management controls for %s", tier => {
  platform.native = true;
  expect(control(settings(tier), "Upgrade")).toBeUndefined();
  expect(control(settings(tier), "Manage Subscription")).toBeUndefined();
});
it("preserves the web Stripe checkout payload and redirect", async () => {
  const onClick = control(NativeUpgradeButton({ tier: "pro", interval: "yearly" }), "Go Pro");
  expect(onClick).toBeTypeOf("function");
  await onClick!();
  expect(fetch).toHaveBeenCalledWith("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"priceType":"yearly","tier":"pro"}' });
  expect(window.location.href).toBe("https://checkout.example.test/session");
});
it("preserves web portal management from direct pricing and settings", async () => {
  await control(PricingClient({ currentTier: "premium" }), "Manage Subscription")!();
  await control(settings("premium"), "Manage Subscription")!();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenCalledWith("/api/stripe/portal", { method: "POST" });
  expect(window.location.href).toBe("https://checkout.example.test/session");
});
it("rechecks the native bridge before stale web controls can request checkout or portal", async () => {
  const checkout = control(NativeUpgradeButton({ tier: "pro", interval: "monthly" }), "Go Pro");
  const pricingPortal = control(PricingClient({ currentTier: "premium" }), "Manage Subscription");
  const settingsPortal = control(settings("premium"), "Manage Subscription");
  const settingsUpgrade = control(settings("free"), "Upgrade");
  platform.native = true;
  await checkout!(); await pricingPortal!(); await settingsPortal!(); await settingsUpgrade!();
  expect(fetch).not.toHaveBeenCalled();
  expect(window.location.href).toBe("");
});
