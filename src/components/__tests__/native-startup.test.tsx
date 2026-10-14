import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { RevenueCatInit } from "@/components/revenuecat-init";
import { CapacitorInit } from "@/components/capacitor-init";
import { initRevenueCat, purchasePackage, restorePurchases, getCustomerInfo } from "@/lib/revenuecat";
import { initPushNotifications } from "@/lib/push/capacitor";

const native = vi.hoisted(() => ({
  effects: [] as Array<() => void>,
  configure: vi.fn(), logIn: vi.fn(), requestPermissions: vi.fn(async () => ({ receive: "granted" })),
  register: vi.fn(), addListener: vi.fn(), backHandler: vi.fn(),
}));
vi.mock("react", async (importOriginal) => ({ ...await importOriginal<typeof import("react")>(), useEffect: (effect: () => void) => native.effects.push(effect) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" } }));
vi.mock("@revenuecat/purchases-capacitor", () => ({ Purchases: { configure: native.configure, logIn: native.logIn, getOfferings: vi.fn(async () => ({ current: null })), restorePurchases: vi.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })), getCustomerInfo: vi.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })) } }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: native }));
vi.mock("@capacitor/status-bar", () => ({ StatusBar: { setStyle: vi.fn(), setBackgroundColor: vi.fn() }, Style: { Dark: "DARK" } }));
vi.mock("@/lib/capacitor/back-handler", () => ({ initAndroidBackHandler: native.backHandler }));

beforeEach(() => {
  vi.clearAllMocks(); native.effects = [];
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", { Capacitor: { isNativePlatform: () => true } });
  vi.stubEnv("NEXT_PUBLIC_REVENUECAT_ANDROID_KEY", "test-only-public-key");
});
it("does not initialize RevenueCat from the mounted dashboard startup", async () => {
  renderToStaticMarkup(<RevenueCatInit userId="test-user" />);
  native.effects.forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  expect(native.configure).not.toHaveBeenCalled();
});
it("disables legacy purchase SDK entry points", async () => {
  await initRevenueCat("test-user");
  expect(await purchasePackage("pro_monthly")).toBe(false);
  expect(await restorePurchases()).toEqual([]);
  expect(await getCustomerInfo()).toEqual([]);
  expect(native.configure).not.toHaveBeenCalled();
  expect(native.logIn).not.toHaveBeenCalled();
});
it("keeps native navigation startup without requesting notifications", async () => {
  renderToStaticMarkup(<CapacitorInit />);
  native.effects.forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  expect(native.backHandler).toHaveBeenCalledOnce();
  expect(native.requestPermissions).not.toHaveBeenCalled();
  expect(native.register).not.toHaveBeenCalled();
});
it("does not register push from the legacy entry point", async () => {
  const result = initPushNotifications();
  await new Promise(resolve => setImmediate(resolve));
  expect(native.requestPermissions).not.toHaveBeenCalled();
  expect(await result).toBeNull();
});
