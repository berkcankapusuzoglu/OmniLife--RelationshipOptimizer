import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initRevenueCat, purchasePackage, restorePurchases, getCustomerInfo } from "@/lib/revenuecat";
import { initPushNotifications } from "@/lib/push/capacitor";

/**
 * Native startup policy (v1.1.0).
 * - RevenueCat is configured exactly once per page load, and only when the
 *   server flag is on, the bridge is native and a user id is known.
 * - Push permission is never requested at launch; only the explicit opt-in
 *   flow (`enablePushNotifications`) may prompt.
 */

const native = vi.hoisted(() => ({
  platform: true,
  effects: [] as Array<() => void>,
  configure: vi.fn(async () => {}), logIn: vi.fn(), requestPermissions: vi.fn(async () => ({ receive: "granted" })),
  checkPermissions: vi.fn(async () => ({ receive: "prompt" })),
  register: vi.fn(), addListener: vi.fn(async () => ({ remove: vi.fn() })), backHandler: vi.fn(),
}));
vi.mock("react", async (importOriginal) => ({ ...await importOriginal<typeof import("react")>(), useEffect: (effect: () => void) => native.effects.push(effect) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => native.platform, getPlatform: () => (native.platform ? "android" : "web") } }));
vi.mock("@revenuecat/purchases-capacitor", () => ({ Purchases: { configure: native.configure, logIn: native.logIn, getOfferings: vi.fn(async () => ({ current: null })), restorePurchases: vi.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })), getCustomerInfo: vi.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })) } }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: native }));
vi.mock("@capacitor/status-bar", () => ({ StatusBar: { setStyle: vi.fn(), setBackgroundColor: vi.fn() }, Style: { Dark: "DARK" } }));
vi.mock("@capacitor/app", () => ({ App: { addListener: native.addListener } }));
vi.mock("@/lib/capacitor/back-handler", () => ({ initAndroidBackHandler: native.backHandler }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

async function runEffects() {
  native.effects.forEach(effect => effect());
  native.effects = [];
  for (let i = 0; i < 3; i++) await new Promise(resolve => setImmediate(resolve));
}
/** Fresh module graph so RevenueCat's "configured once" state starts empty. */
async function freshRevenueCatInit() {
  vi.resetModules();
  return (await import("@/components/revenuecat-init")).RevenueCatInit;
}

beforeEach(() => {
  vi.clearAllMocks(); native.effects = []; native.platform = true;
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", { Capacitor: { isNativePlatform: () => native.platform } });
  vi.stubEnv("NEXT_PUBLIC_REVENUECAT_ANDROID_KEY", "test-only-public-key");
});

describe("RevenueCat configuration at startup", () => {
  it("configures exactly once when native, flag on and a user is signed in, even across re-renders", async () => {
    const RevenueCatInit = await freshRevenueCatInit();
    renderToStaticMarkup(<RevenueCatInit userId="test-user" enabled />);
    renderToStaticMarkup(<RevenueCatInit userId="test-user" enabled />);
    await runEffects();
    expect(native.configure).toHaveBeenCalledTimes(1);
    expect(native.configure).toHaveBeenCalledWith({ apiKey: "test-only-public-key", appUserID: "test-user" });
    expect(native.logIn).not.toHaveBeenCalled();
  });
  it("never configures while the server flag is off (default prop)", async () => {
    const RevenueCatInit = await freshRevenueCatInit();
    renderToStaticMarkup(<RevenueCatInit userId="test-user" />);
    renderToStaticMarkup(<RevenueCatInit userId="test-user" enabled={false} />);
    await runEffects();
    expect(native.configure).not.toHaveBeenCalled();
  });
  it("never configures on the web, even with the flag on", async () => {
    native.platform = false;
    const RevenueCatInit = await freshRevenueCatInit();
    renderToStaticMarkup(<RevenueCatInit userId="test-user" enabled />);
    await runEffects();
    expect(native.configure).not.toHaveBeenCalled();
  });
  it("never configures without a signed-in user id", async () => {
    const RevenueCatInit = await freshRevenueCatInit();
    renderToStaticMarkup(<RevenueCatInit userId="" enabled />);
    await runEffects();
    expect(native.configure).not.toHaveBeenCalled();
  });
  it("never configures without a public key in the build", async () => {
    vi.stubEnv("NEXT_PUBLIC_REVENUECAT_ANDROID_KEY", "");
    const RevenueCatInit = await freshRevenueCatInit();
    renderToStaticMarkup(<RevenueCatInit userId="test-user" enabled />);
    await runEffects();
    expect(native.configure).not.toHaveBeenCalled();
  });
  it("keeps the legacy purchase entry points inert", async () => {
    await initRevenueCat("test-user");
    expect(await purchasePackage("premium_monthly")).toBe(false);
    expect(await restorePurchases()).toEqual([]);
    expect(await getCustomerInfo()).toEqual([]);
    expect(native.configure).not.toHaveBeenCalled();
    expect(native.logIn).not.toHaveBeenCalled();
  });
});

describe("push notifications at startup", () => {
  it("wires navigation and notification taps without requesting permission or registering", async () => {
    vi.resetModules();
    const { CapacitorInit } = await import("@/components/capacitor-init");
    renderToStaticMarkup(<CapacitorInit />);
    await runEffects();
    expect(native.backHandler).toHaveBeenCalledOnce();
    expect(native.addListener).toHaveBeenCalledWith("pushNotificationActionPerformed", expect.any(Function));
    expect(native.requestPermissions).not.toHaveBeenCalled();
    expect(native.checkPermissions).not.toHaveBeenCalled();
    expect(native.register).not.toHaveBeenCalled();
  });
  it("does not register push from the legacy entry point", async () => {
    const result = initPushNotifications();
    await new Promise(resolve => setImmediate(resolve));
    expect(native.requestPermissions).not.toHaveBeenCalled();
    expect(await result).toBeNull();
  });
  it("does nothing at all on the web", async () => {
    native.platform = false;
    vi.resetModules();
    const { CapacitorInit } = await import("@/components/capacitor-init");
    renderToStaticMarkup(<CapacitorInit />);
    await runEffects();
    expect(native.backHandler).not.toHaveBeenCalled();
    expect(native.addListener).not.toHaveBeenCalled();
  });
  it("mounts the biometric lock without prompting when the lock preference is off", async () => {
    vi.resetModules();
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    const { BiometricLock } = await import("@/components/biometric-lock");
    expect(renderToStaticMarkup(<BiometricLock />)).toBe("");
    await runEffects();
    expect(native.addListener).toHaveBeenCalledWith("appStateChange", expect.any(Function));
    expect(native.requestPermissions).not.toHaveBeenCalled();
  });
});
