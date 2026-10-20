import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CapacitorInit } from "@/components/capacitor-init";
import { NotificationPrePrompt } from "@/components/notification-preprompt";
import { NotificationSettings } from "@/components/notification-settings";
import { disablePushNotifications, enablePushNotifications } from "@/lib/push/capacitor";
import { submitDailyLog } from "@/app/(dashboard)/daily/actions";
import { dailyLogs } from "@/lib/db/schema";

type Listener = (event: { value?: string; notification?: { data?: Record<string, unknown> } }) => void;

const native = vi.hoisted(() => ({
  isNative: true,
  effects: [] as Array<() => void>,
  listeners: {} as Record<string, Listener>,
  permission: "prompt" as string,
  requested: "granted" as string,
  checkPermissions: vi.fn(async () => ({ receive: native.permission })),
  requestPermissions: vi.fn(async () => ({ receive: native.requested })),
  register: vi.fn(async () => {
    native.listeners.registration?.({ value: "device-token-1" });
  }),
  unregister: vi.fn(async () => {}),
  removeAllListeners: vi.fn(async () => {}),
  addListener: vi.fn(async (name: string, listener: Listener) => {
    native.listeners[name] = listener;
    return { remove: async () => {} };
  }),
  push: vi.fn(),
  fetch: vi.fn(async (...[]: [string, { method?: string; body?: string }?]) => ({ ok: true, json: async () => ({ ok: true }) })),
  store: new Map<string, string>(),
  logCount: 1,
}));

vi.mock("react", async (importOriginal) => ({ ...await importOriginal<typeof import("react")>(), useEffect: (effect: () => void) => native.effects.push(effect) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => native.isNative, getPlatform: () => (native.isNative ? "android" : "web") } }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: native }));
vi.mock("@capacitor/status-bar", () => ({ StatusBar: { setStyle: vi.fn(), setBackgroundColor: vi.fn() }, Style: { Dark: "DARK" } }));
vi.mock("@/lib/capacitor/back-handler", () => ({ initAndroidBackHandler: vi.fn() }));
vi.mock("@/lib/capacitor/platform", () => ({ isNativePlatform: () => native.isNative, useNativePlatform: () => native.isNative }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: native.push, refresh: vi.fn() }) }));

// submitDailyLog dependencies: never touch the real database.
const db = vi.hoisted(() => {
  const chain = (): Record<string, unknown> => {
    let table: unknown;
    let projection: Record<string, unknown> | undefined;
    const q: Record<string, unknown> = {};
    const self = () => q;
    Object.assign(q, {
      select: (p?: Record<string, unknown>) => { projection = p; return q; },
      from: (t: unknown) => { table = t; return q; },
      where: self, orderBy: self, limit: self, values: self, set: self, update: self, insert: self,
      then: (resolve: (rows: unknown[]) => void) => {
        if (projection && "count" in projection) return resolve([{ count: table === db.tables.dailyLogs ? native.logCount : 0 }]);
        return resolve([]);
      },
    });
    return q;
  };
  return { tables: {} as Record<string, unknown>, chain };
});
vi.mock("@/lib/db", () => ({ getDb: () => new Proxy({}, { get: (_t, key) => (db.chain() as Record<string, unknown>)[key as string] }) }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => ({ id: "00000000-0000-4000-8000-000000000001", partnerId: null, alphaWeight: "0.5", betaWeight: "0.5", pillarVitalityWeight: "0.25", pillarGrowthWeight: "0.25", pillarSecurityWeight: "0.25", pillarConnectionWeight: "0.25", relEmotionalWeight: "0.2", relTrustWeight: "0.2", relFairnessWeight: "0.2", relStressWeight: "0.2", relAutonomyWeight: "0.2" }) }));
vi.mock("@/lib/auth/authorization", () => ({ linkedPartnerId: async () => null }));
vi.mock("@/lib/streaks", () => ({ updateStreak: async () => ({ currentStreak: 1, longestStreak: 1 }) }));
vi.mock("@/lib/analytics/track", () => ({ trackEvent: () => {} }));

const daily = { vitality: 5, growth: 5, security: 5, connection: 5, emotional: 5, trust: 5, fairness: 5, stress: 5, autonomy: 5, mood: 5, energyLevel: 5, notes: "" };

beforeEach(() => {
  vi.clearAllMocks();
  db.tables.dailyLogs = dailyLogs;
  native.isNative = true; native.effects = []; native.listeners = {}; native.permission = "prompt"; native.requested = "granted"; native.logCount = 1;
  native.store.clear();
  vi.stubGlobal("React", React);
  vi.stubGlobal("fetch", native.fetch);
  vi.stubGlobal("localStorage", { getItem: (k: string) => native.store.get(k) ?? null, setItem: (k: string, v: string) => { native.store.set(k, v); }, removeItem: (k: string) => { native.store.delete(k); } });
  vi.stubGlobal("window", { Capacitor: { isNativePlatform: () => native.isNative } });
});

describe("enablePushNotifications", () => {
  it("asks for permission, registers and posts the token to /api/push/register", async () => {
    expect(await enablePushNotifications()).toBe("granted");
    expect(native.checkPermissions).toHaveBeenCalledOnce();
    expect(native.requestPermissions).toHaveBeenCalledOnce();
    expect(native.register).toHaveBeenCalledOnce();
    expect(native.fetch).toHaveBeenCalledWith("/api/push/register", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(native.fetch.mock.calls[0][1]?.body ?? "{}")).toEqual({ token: "device-token-1", platform: "android" });
  });
  it("skips the prompt when permission is already granted", async () => {
    native.permission = "granted";
    expect(await enablePushNotifications()).toBe("granted");
    expect(native.requestPermissions).not.toHaveBeenCalled();
    expect(native.register).toHaveBeenCalledOnce();
  });
  it("returns denied without registering when the user refuses", async () => {
    native.requested = "denied";
    expect(await enablePushNotifications()).toBe("denied");
    expect(native.register).not.toHaveBeenCalled();
    expect(native.fetch).not.toHaveBeenCalled();
  });
  it("returns denied immediately when permission was previously denied", async () => {
    native.permission = "denied";
    expect(await enablePushNotifications()).toBe("denied");
    expect(native.requestPermissions).not.toHaveBeenCalled();
  });
  it("is unsupported on the web and never loads the plugin", async () => {
    native.isNative = false;
    expect(await enablePushNotifications()).toBe("unsupported");
    expect(native.checkPermissions).not.toHaveBeenCalled();
    expect(native.fetch).not.toHaveBeenCalled();
  });
});

describe("disablePushNotifications", () => {
  it("deletes the registered token on the server and unregisters", async () => {
    await enablePushNotifications();
    native.fetch.mockClear();
    await disablePushNotifications();
    expect(native.fetch).toHaveBeenCalledWith("/api/push/register", expect.objectContaining({ method: "DELETE" }));
    expect(JSON.parse(native.fetch.mock.calls[0][1]?.body ?? "{}")).toEqual({ token: "device-token-1" });
    expect(native.unregister).toHaveBeenCalledOnce();
  });
  it("still opts out on the server when no token is stored locally", async () => {
    await disablePushNotifications();
    expect(native.fetch).toHaveBeenCalledWith("/api/push/register", expect.objectContaining({ method: "DELETE" }));
    expect(JSON.parse(native.fetch.mock.calls[0][1]?.body ?? "{}")).toEqual({});
    expect(native.unregister).toHaveBeenCalledOnce();
  });
  it("is a no-op on the web", async () => {
    native.isNative = false;
    await disablePushNotifications();
    expect(native.fetch).not.toHaveBeenCalled();
  });
});

describe("CapacitorInit", () => {
  it("routes notification taps to their path without requesting permission", async () => {
    renderToStaticMarkup(<CapacitorInit />);
    native.effects.forEach(effect => effect());
    await new Promise(resolve => setImmediate(resolve));
    expect(native.addListener).toHaveBeenCalledWith("pushNotificationActionPerformed", expect.any(Function));
    native.listeners.pushNotificationActionPerformed?.({ notification: { data: { path: "/daily" } } });
    expect(native.push).toHaveBeenCalledWith("/daily");
    expect(native.requestPermissions).not.toHaveBeenCalled();
    expect(native.register).not.toHaveBeenCalled();
  });
  it("ignores taps that carry no safe in-app path", async () => {
    renderToStaticMarkup(<CapacitorInit />);
    native.effects.forEach(effect => effect());
    await new Promise(resolve => setImmediate(resolve));
    native.listeners.pushNotificationActionPerformed?.({ notification: { data: { path: "https://evil.example" } } });
    native.listeners.pushNotificationActionPerformed?.({ notification: { data: {} } });
    expect(native.push).not.toHaveBeenCalled();
  });
});

describe("NotificationPrePrompt", () => {
  it("shows after the first log on native", () => {
    const html = renderToStaticMarkup(<NotificationPrePrompt isFirstLog />);
    expect(html).toContain("reminder");
    expect(html).toContain("Not now");
    expect(native.requestPermissions).not.toHaveBeenCalled();
  });
  it("stays hidden when this is not the first log", () => {
    expect(renderToStaticMarkup(<NotificationPrePrompt isFirstLog={false} />)).toBe("");
  });
  it("stays hidden on the web", () => {
    native.isNative = false;
    expect(renderToStaticMarkup(<NotificationPrePrompt isFirstLog />)).toBe("");
  });
  it("shows only once", () => {
    native.store.set("cm.pushPrompted", "1");
    expect(renderToStaticMarkup(<NotificationPrePrompt isFirstLog />)).toBe("");
  });
});

describe("NotificationSettings", () => {
  it("offers a reminder toggle on native with the current reminder hour", () => {
    const html = renderToStaticMarkup(<NotificationSettings pushOptIn reminderHourUtc={20} />);
    expect(html).toContain("Daily reminder");
    expect(html).toContain("20:00 UTC");
    expect(html).toContain("Turn off");
  });
  it("offers to turn reminders on when opted out", () => {
    const html = renderToStaticMarkup(<NotificationSettings pushOptIn={false} reminderHourUtc={null} />);
    expect(html).toContain("Turn on");
    expect(html).not.toContain("Turn off");
  });
  it("explains that reminders are native-only on the web", () => {
    native.isNative = false;
    const html = renderToStaticMarkup(<NotificationSettings pushOptIn={false} reminderHourUtc={null} />);
    expect(html).toContain("Android app");
    expect(html).not.toContain("Turn on");
  });
});

describe("submitDailyLog", () => {
  it("reports the first log so the client can show the pre-prompt", async () => {
    native.logCount = 1;
    expect((await submitDailyLog(daily)).isFirstLog).toBe(true);
  });
  it("does not flag later logs", async () => {
    native.logCount = 4;
    expect((await submitDailyLog(daily)).isFirstLog).toBe(false);
  });
});
