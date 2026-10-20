import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal hook runtime: state persists across manual re-renders, effects are collected
// and run by the test. Lets renderToStaticMarkup drive async state machines.
const hooks = vi.hoisted(() => ({ store: [] as unknown[], index: 0, effects: [] as Array<() => void | (() => void)> }));
const rc = vi.hoisted(() => ({
  native: true,
  loads: 0,
  configure: vi.fn(async () => {}),
  getOfferings: vi.fn(async () => ({ current: null as unknown })),
  purchasePackage: vi.fn(async () => ({ customerInfo: {}, productIdentifier: "premium_yearly" })),
  restorePurchases: vi.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })),
  getCustomerInfo: vi.fn(async () => ({ customerInfo: { managementURL: null as string | null } })),
  browserOpen: vi.fn(async () => {}),
  sync: vi.fn(async () => "unchanged"),
  refresh: vi.fn(),
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const i = hooks.index++;
      if (!(i in hooks.store)) hooks.store[i] = typeof initial === "function" ? (initial as () => unknown)() : initial;
      return [hooks.store[i], (next: unknown) => { hooks.store[i] = typeof next === "function" ? (next as (prev: unknown) => unknown)(hooks.store[i]) : next; }];
    },
    useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
  };
});
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => rc.native, getPlatform: () => (rc.native ? "android" : "web") } }));
vi.mock("@revenuecat/purchases-capacitor", () => {
  rc.loads += 1;
  return {
    Purchases: { configure: rc.configure, getOfferings: rc.getOfferings, purchasePackage: rc.purchasePackage, restorePurchases: rc.restorePurchases, getCustomerInfo: rc.getCustomerInfo },
    PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: "1", STORE_PROBLEM_ERROR: "2", PRODUCT_ALREADY_PURCHASED_ERROR: "6", NETWORK_ERROR: "10", PAYMENT_PENDING_ERROR: "20" },
  };
});
vi.mock("@capacitor/browser", () => ({ Browser: { open: rc.browserOpen } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: rc.refresh }) }));
vi.mock("@/lib/revenuecat/sync", () => ({ syncRevenueCatEntitlement: rc.sync }));

type Props = { children?: React.ReactNode; onClick?: () => Promise<void> | void; disabled?: boolean };
function elements(node: React.ReactNode): React.ReactElement<Props>[] {
  const result: React.ReactElement<Props>[] = [];
  React.Children.forEach(node, (child) => {
    if (React.isValidElement<Props>(child)) result.push(child, ...elements(child.props.children));
  });
  return result;
}
function text(markup: string) {
  return markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}
async function flush() {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
}
function offering(packages: Array<{ product: string; type: string; price: string; period: string; trial?: boolean }>) {
  return { current: { availablePackages: packages.map((p) => ({
    identifier: p.type === "MONTHLY" ? "$rc_monthly" : "$rc_annual",
    packageType: p.type,
    product: { identifier: `${p.product}:base`, priceString: p.price, subscriptionPeriod: p.period, defaultOption: p.trial ? { freePhase: { billingPeriod: { unit: "DAY", value: 7 } } } : null },
  })) } };
}

async function mount(load: () => Promise<React.ReactElement>) {
  hooks.store = []; hooks.effects = [];
  // Invoke the component function so the returned tree exposes real handlers (no DOM renderer).
  const render = async () => {
    hooks.index = 0; hooks.effects = [];
    const outer = await load();
    const element = (outer.type as (props: unknown) => React.ReactElement)(outer.props);
    const markup = renderToStaticMarkup(element);
    return { element, markup };
  };
  let out = await render();
  for (let round = 0; round < 4; round++) {
    const effects = hooks.effects; hooks.effects = [];
    effects.forEach((effect) => effect());
    await flush();
    out = await render();
  }
  return { ...out, rerender: async () => { await flush(); return render(); } };
}

async function paywall(props: { userId: string; enabled: boolean }) {
  vi.resetModules();
  const { NativePaywall } = await import("@/components/native-paywall");
  return mount(async () => <NativePaywall {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  rc.native = true; rc.loads = 0;
  rc.getOfferings.mockResolvedValue(offering([
    { product: "premium_yearly", type: "ANNUAL", price: "₺749,99", period: "P1Y", trial: true },
    { product: "premium_monthly", type: "MONTHLY", price: "₺149,99", period: "P1M" },
  ]));
  vi.stubGlobal("React", React);
  vi.stubEnv("NEXT_PUBLIC_REVENUECAT_ANDROID_KEY", "test-only-public-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("NativePaywall", () => {
  it("renders nothing with the server flag off, even on native", async () => {
    const { markup } = await paywall({ userId: "u1", enabled: false });
    expect(markup).toBe("");
    expect(markup).not.toMatch(/\$/);
    expect(rc.loads).toBe(0);
    expect(rc.configure).not.toHaveBeenCalled();
  });
  it("renders nothing on the web and never imports the plugin", async () => {
    rc.native = false;
    const { markup } = await paywall({ userId: "u1", enabled: true });
    expect(markup).toBe("");
    expect(rc.loads).toBe(0);
  });
  it("lists both store-priced packages with yearly preselected and no hard-coded price", async () => {
    const { markup } = await paywall({ userId: "u1", enabled: true });
    expect(markup).toContain("₺749,99");
    expect(markup).toContain("₺149,99");
    expect(markup).toContain("Both of you");
    expect(markup).toContain("7-day free trial");
    expect(markup).not.toMatch(/4\.99|24\.99|\$/);
    expect(markup).toMatch(/aria-pressed="true"[^>]*>[^<]*Yearly|Yearly[^<]*<[^>]*aria-pressed="true"|aria-checked="true"/);
    expect(markup).toContain("Restore purchases");
    expect(rc.configure).toHaveBeenCalledTimes(1);
  });
  it("shows the no-offering state without prices", async () => {
    rc.getOfferings.mockResolvedValue({ current: null });
    const { markup } = await paywall({ userId: "u1", enabled: true });
    expect(markup).toContain("Plans are not available yet");
    expect(markup).not.toMatch(/₺|\$/);
  });
  it("shows the not-configured state when the build has no public key", async () => {
    vi.stubEnv("NEXT_PUBLIC_REVENUECAT_ANDROID_KEY", "");
    const { markup } = await paywall({ userId: "u1", enabled: true });
    expect(markup).toContain("Purchases are unavailable in this build");
    expect(rc.loads).toBe(0);
  });
  it("stays silent when the user cancels", async () => {
    rc.purchasePackage.mockRejectedValueOnce(Object.assign(new Error("cancelled"), { code: "1" }));
    const page = await paywall({ userId: "u1", enabled: true });
    const buy = elements(page.element).find((e) => typeof e.props.children === "string" && /Start free trial|Subscribe/.test(e.props.children))?.props.onClick;
    expect(buy).toBeTypeOf("function");
    await buy!();
    const { markup } = await page.rerender();
    expect(text(markup)).not.toMatch(/could not be completed|failed|pending|already owned|cancelled/i);
    expect(rc.sync).not.toHaveBeenCalled();
  });
  it("explains a pending store payment", async () => {
    rc.purchasePackage.mockRejectedValueOnce(Object.assign(new Error("pending"), { code: "20" }));
    const page = await paywall({ userId: "u1", enabled: true });
    await elements(page.element).find((e) => typeof e.props.children === "string" && /Start free trial|Subscribe/.test(e.props.children))!.props.onClick!();
    const { markup } = await page.rerender();
    expect(text(markup)).toMatch(/pending/i);
  });
  it("restores when the store says the product is already owned", async () => {
    rc.purchasePackage.mockRejectedValueOnce(Object.assign(new Error("owned"), { code: "6" }));
    rc.restorePurchases.mockResolvedValueOnce({ customerInfo: { entitlements: { active: { premium: {} } } } });
    const page = await paywall({ userId: "u1", enabled: true });
    await elements(page.element).find((e) => typeof e.props.children === "string" && /Start free trial|Subscribe/.test(e.props.children))!.props.onClick!();
    await page.rerender();
    expect(rc.restorePurchases).toHaveBeenCalledTimes(1);
    expect(rc.sync).toHaveBeenCalledTimes(1);
    expect(rc.refresh).toHaveBeenCalled();
  });
  it("syncs the server entitlement and refreshes after a successful purchase", async () => {
    const page = await paywall({ userId: "u1", enabled: true });
    await elements(page.element).find((e) => typeof e.props.children === "string" && /Start free trial|Subscribe/.test(e.props.children))!.props.onClick!();
    expect(rc.purchasePackage).toHaveBeenCalledTimes(1);
    expect(rc.sync).toHaveBeenCalledTimes(1);
    expect(rc.refresh).toHaveBeenCalledTimes(1);
  });
  it("surfaces store errors explicitly", async () => {
    rc.purchasePackage.mockRejectedValueOnce(Object.assign(new Error("Store problem"), { code: "2" }));
    const page = await paywall({ userId: "u1", enabled: true });
    await elements(page.element).find((e) => typeof e.props.children === "string" && /Start free trial|Subscribe/.test(e.props.children))!.props.onClick!();
    const { markup } = await page.rerender();
    expect(text(markup)).toMatch(/could not be completed|try again/i);
  });
});

describe("RevenueCatInit", () => {
  it("configures once per user id when enabled on native", async () => {
    vi.resetModules();
    const { RevenueCatInit } = await import("@/components/revenuecat-init");
    await mount(async () => <RevenueCatInit userId="u1" enabled />);
    await mount(async () => <RevenueCatInit userId="u1" enabled />);
    expect(rc.configure).toHaveBeenCalledTimes(1);
  });
  it("never configures when disabled or on the web", async () => {
    vi.resetModules();
    const { RevenueCatInit } = await import("@/components/revenuecat-init");
    await mount(async () => <RevenueCatInit userId="u1" enabled={false} />);
    rc.native = false;
    await mount(async () => <RevenueCatInit userId="u1" enabled />);
    expect(rc.configure).not.toHaveBeenCalled();
    expect(rc.loads).toBe(0);
  });
});

describe("ManageSubscriptionButton", () => {
  it("opens the RevenueCat management url when the store provides one", async () => {
    rc.getCustomerInfo.mockResolvedValueOnce({ customerInfo: { managementURL: "https://play.google.com/store/account/subscriptions?sku=premium_yearly&package=app.couplemetric.android" } });
    vi.resetModules();
    const { configureRevenueCat } = await import("@/lib/revenuecat/client");
    await configureRevenueCat("u1");
    const { ManageSubscriptionButton } = await import("@/components/manage-subscription-button");
    const { element } = await mount(async () => <ManageSubscriptionButton source="revenuecat" productId="premium_yearly" />);
    await elements(element).find((e) => e.props.onClick)!.props.onClick!();
    expect(rc.browserOpen).toHaveBeenCalledWith({ url: "https://play.google.com/store/account/subscriptions?sku=premium_yearly&package=app.couplemetric.android" });
  });
  it("falls back to the Play subscriptions page for the product", async () => {
    vi.resetModules();
    const { ManageSubscriptionButton } = await import("@/components/manage-subscription-button");
    const { element } = await mount(async () => <ManageSubscriptionButton source="revenuecat" productId="premium_monthly" />);
    await elements(element).find((e) => e.props.onClick)!.props.onClick!();
    expect(rc.browserOpen).toHaveBeenCalledWith({ url: "https://play.google.com/store/account/subscriptions?sku=premium_monthly&package=app.couplemetric.android" });
  });
  it("uses the Stripe portal for web subscriptions", async () => {
    rc.native = false;
    vi.stubGlobal("window", { location: { href: "" } });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ url: "https://billing.example.test/portal" }) })));
    vi.resetModules();
    const { ManageSubscriptionButton } = await import("@/components/manage-subscription-button");
    const { element } = await mount(async () => <ManageSubscriptionButton source="stripe" productId={null} />);
    await elements(element).find((e) => e.props.onClick)!.props.onClick!();
    expect(fetch).toHaveBeenCalledWith("/api/stripe/portal", { method: "POST" });
    expect(window.location.href).toBe("https://billing.example.test/portal");
    expect(rc.browserOpen).not.toHaveBeenCalled();
  });
  it("never opens the Stripe portal on native: a web subscription gets a neutral note", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ url: "https://billing.example.test/portal" }) })));
    vi.resetModules();
    const { ManageSubscriptionButton } = await import("@/components/manage-subscription-button");
    const { markup, element } = await mount(async () => <ManageSubscriptionButton source="stripe" productId={null} />);
    expect(markup).toContain("Manage your subscription on the web");
    expect(markup).not.toMatch(/Manage Subscription|href=|stripe/i);
    expect(elements(element).find((e) => e.props.onClick)).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    expect(rc.browserOpen).not.toHaveBeenCalled();
  });
  it("labels complimentary access without a control", async () => {
    vi.resetModules();
    const { ManageSubscriptionButton } = await import("@/components/manage-subscription-button");
    const { markup, element } = await mount(async () => <ManageSubscriptionButton source="manual" productId={null} />);
    expect(markup).toContain("Complimentary access");
    expect(elements(element).find((e) => e.props.onClick)).toBeUndefined();
  });
});

describe("RestorePurchasesButton", () => {
  it("restores, syncs and reports when nothing is found", async () => {
    vi.resetModules();
    const { configureRevenueCat } = await import("@/lib/revenuecat/client");
    await configureRevenueCat("u1");
    const { RestorePurchasesButton } = await import("@/components/restore-purchases-button");
    const page = await mount(async () => <RestorePurchasesButton />);
    await elements(page.element).find((e) => e.props.onClick)!.props.onClick!();
    const { markup } = await page.rerender();
    expect(rc.restorePurchases).toHaveBeenCalledTimes(1);
    expect(rc.sync).toHaveBeenCalledTimes(1);
    expect(text(markup)).toMatch(/No previous purchases/i);
  });
});
