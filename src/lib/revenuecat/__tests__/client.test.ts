import { beforeEach, describe, expect, it, vi } from "vitest";

const rc = vi.hoisted(() => ({
  native: true,
  configure: vi.fn(async () => {}),
  getOfferings: vi.fn(async () => ({ current: null as unknown })),
  purchasePackage: vi.fn(async () => ({ customerInfo: {}, productIdentifier: "premium_yearly" })),
  restorePurchases: vi.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })),
  getCustomerInfo: vi.fn(async () => ({ customerInfo: { managementURL: null as string | null } })),
  loads: 0,
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => rc.native, getPlatform: () => (rc.native ? "android" : "web") } }));
vi.mock("@revenuecat/purchases-capacitor", () => {
  rc.loads += 1;
  return {
    Purchases: { configure: rc.configure, getOfferings: rc.getOfferings, purchasePackage: rc.purchasePackage, restorePurchases: rc.restorePurchases, getCustomerInfo: rc.getCustomerInfo },
    PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: "1", STORE_PROBLEM_ERROR: "2", PRODUCT_ALREADY_PURCHASED_ERROR: "6", NETWORK_ERROR: "10", PAYMENT_PENDING_ERROR: "20" },
  };
});

function pkg(productId: string, packageType: string, period: string | null, freeDays: { unit: string; value: number } | null) {
  return {
    identifier: packageType === "MONTHLY" ? "$rc_monthly" : "$rc_annual",
    packageType,
    product: {
      identifier: `${productId}:base`,
      priceString: productId === "premium_monthly" ? "₺149,99" : "₺749,99",
      subscriptionPeriod: period,
      defaultOption: freeDays ? { freePhase: { billingPeriod: freeDays } } : null,
    },
  };
}

async function client() {
  vi.resetModules();
  return import("@/lib/revenuecat/client");
}

beforeEach(() => {
  vi.clearAllMocks();
  rc.native = true;
  rc.loads = 0;
  vi.stubEnv("NEXT_PUBLIC_REVENUECAT_ANDROID_KEY", "test-only-public-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("configureRevenueCat", () => {
  it("returns false without loading the plugin on the web", async () => {
    rc.native = false;
    const { configureRevenueCat } = await client();
    expect(await configureRevenueCat("user-1")).toBe(false);
    expect(rc.configure).not.toHaveBeenCalled();
  });
  it("returns false without a public key", async () => {
    vi.stubEnv("NEXT_PUBLIC_REVENUECAT_ANDROID_KEY", "");
    const { configureRevenueCat } = await client();
    expect(await configureRevenueCat("user-1")).toBe(false);
    expect(rc.configure).not.toHaveBeenCalled();
  });
  it("configures once per page load with the signed-in user as app user id", async () => {
    const { configureRevenueCat } = await client();
    expect(await configureRevenueCat("user-1")).toBe(true);
    expect(await configureRevenueCat("user-1")).toBe(true);
    expect(rc.configure).toHaveBeenCalledTimes(1);
    expect(rc.configure).toHaveBeenCalledWith({ apiKey: "test-only-public-key", appUserID: "user-1" });
  });
});

describe("loadOffering", () => {
  it("reports not-configured before configure succeeded", async () => {
    rc.native = false;
    const { loadOffering } = await client();
    expect(await loadOffering()).toEqual({ error: "not-configured" });
  });
  it("reports no-offering when the current offering is empty", async () => {
    rc.getOfferings.mockResolvedValueOnce({ current: null });
    const { configureRevenueCat, loadOffering } = await client();
    await configureRevenueCat("user-1");
    expect(await loadOffering()).toEqual({ error: "no-offering" });
  });
  it("maps store packages to premium ids with store prices and trial days", async () => {
    rc.getOfferings.mockResolvedValueOnce({ current: { availablePackages: [
      pkg("premium_yearly", "ANNUAL", "P1Y", { unit: "WEEK", value: 1 }),
      pkg("premium_monthly", "MONTHLY", "P1M", null),
      pkg("coins", "CUSTOM", null, null),
    ] } });
    const { configureRevenueCat, loadOffering } = await client();
    await configureRevenueCat("user-1");
    expect(await loadOffering()).toEqual({ packages: [
      { id: "premium_yearly", priceString: "₺749,99", period: "P1Y", trialDays: 7 },
      { id: "premium_monthly", priceString: "₺149,99", period: "P1M", trialDays: null },
    ] });
  });
  it("reports network when the store is unreachable", async () => {
    rc.getOfferings.mockRejectedValueOnce(Object.assign(new Error("offline"), { code: "10" }));
    const { configureRevenueCat, loadOffering } = await client();
    await configureRevenueCat("user-1");
    expect(await loadOffering()).toEqual({ error: "network" });
  });
});

describe("purchase", () => {
  it.each([
    ["1", "cancelled"],
    ["20", "pending"],
    ["6", "already-owned"],
  ])("maps error code %s to %s", async (code, status) => {
    rc.getOfferings.mockResolvedValueOnce({ current: { availablePackages: [pkg("premium_yearly", "ANNUAL", "P1Y", null)] } });
    rc.purchasePackage.mockRejectedValueOnce(Object.assign(new Error("store said no"), { code }));
    const { configureRevenueCat, purchase } = await client();
    await configureRevenueCat("user-1");
    expect(await purchase("premium_yearly")).toEqual({ status });
  });
  it.each(["10", "2"])("maps error code %s to an explicit error", async (code) => {
    rc.getOfferings.mockResolvedValueOnce({ current: { availablePackages: [pkg("premium_yearly", "ANNUAL", "P1Y", null)] } });
    rc.purchasePackage.mockRejectedValueOnce(Object.assign(new Error("store said no"), { code }));
    const { configureRevenueCat, purchase } = await client();
    await configureRevenueCat("user-1");
    expect(await purchase("premium_yearly")).toEqual({ status: "error", code, message: "store said no" });
  });
  it("purchases the matching store package and reports success", async () => {
    const yearly = pkg("premium_yearly", "ANNUAL", "P1Y", null);
    rc.getOfferings.mockResolvedValueOnce({ current: { availablePackages: [pkg("premium_monthly", "MONTHLY", "P1M", null), yearly] } });
    const { configureRevenueCat, purchase } = await client();
    await configureRevenueCat("user-1");
    expect(await purchase("premium_yearly")).toEqual({ status: "success" });
    expect(rc.purchasePackage).toHaveBeenCalledWith({ aPackage: yearly });
  });
  it("fails closed when not configured", async () => {
    rc.native = false;
    const { purchase } = await client();
    expect(await purchase("premium_yearly")).toMatchObject({ status: "error", code: "not-configured" });
    expect(rc.purchasePackage).not.toHaveBeenCalled();
  });
});

describe("restore and management", () => {
  it("reports whether an entitlement is active after restore", async () => {
    rc.restorePurchases.mockResolvedValueOnce({ customerInfo: { entitlements: { active: { premium: {} } } } });
    const { configureRevenueCat, restore } = await client();
    await configureRevenueCat("user-1");
    expect(await restore()).toEqual({ active: true });
    expect(await restore()).toEqual({ active: false });
  });
  it("returns an error string when restore fails or is unavailable", async () => {
    rc.restorePurchases.mockRejectedValueOnce(Object.assign(new Error("offline"), { code: "10" }));
    const { configureRevenueCat, restore } = await client();
    await configureRevenueCat("user-1");
    expect(await restore()).toEqual({ error: "offline" });
    rc.native = false;
    const fresh = await client();
    expect(await fresh.restore()).toEqual({ error: "not-configured" });
  });
  it("exposes the store management url when present", async () => {
    rc.getCustomerInfo.mockResolvedValueOnce({ customerInfo: { managementURL: "https://play.google.com/store/account/subscriptions" } });
    const { configureRevenueCat, managementUrl } = await client();
    await configureRevenueCat("user-1");
    expect(await managementUrl()).toBe("https://play.google.com/store/account/subscriptions");
    expect(await managementUrl()).toBeNull();
  });
});
