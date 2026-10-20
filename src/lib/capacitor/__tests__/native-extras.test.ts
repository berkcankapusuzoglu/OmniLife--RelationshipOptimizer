import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { shareCard } from "../share";
import { hapticScoreReveal } from "../haptics";
import {
  BIOMETRIC_LOCK_KEY,
  isBiometricAvailable,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  verifyIdentity,
} from "../biometric";
import { BiometricLock } from "@/components/biometric-lock";
import { BiometricSettings } from "@/components/biometric-settings";
import { ShareScore } from "@/components/share-score";
import { ResultClient } from "@/app/(public)/quiz/result/result-client";

const state = vi.hoisted(() => ({
  native: false,
  server: false,
  effects: [] as Array<() => void | (() => void)>,
  loaded: { share: false, haptics: false, biometric: false, app: false },
  share: vi.fn(async () => ({ activityType: "android" })),
  impact: vi.fn(async () => undefined),
  isAvailable: vi.fn(async () => ({ isAvailable: true, biometryType: 3 })),
  verify: vi.fn(async () => undefined),
  addListener: vi.fn(async () => ({ remove: vi.fn() })),
  store: new Map<string, string>(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => state.native, getPlatform: () => (state.native ? "android" : "web") },
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
    useSyncExternalStore: (_s: unknown, snapshot: () => unknown, serverSnapshot: () => unknown) =>
      state.server ? serverSnapshot() : snapshot(),
  };
});
vi.mock("@capacitor/share", () => { state.loaded.share = true; return { Share: { share: state.share } }; });
vi.mock("@capacitor/haptics", () => {
  state.loaded.haptics = true;
  return { Haptics: { impact: state.impact }, ImpactStyle: { Light: "LIGHT", Medium: "MEDIUM", Heavy: "HEAVY" } };
});
vi.mock("@capgo/capacitor-native-biometric", () => {
  state.loaded.biometric = true;
  return { NativeBiometric: { isAvailable: state.isAvailable, verifyIdentity: state.verify } };
});
vi.mock("@capacitor/app", () => { state.loaded.app = true; return { App: { addListener: state.addListener } }; });

const flush = () => new Promise((resolve) => setImmediate(resolve));
const localStorageStub = {
  getItem: (key: string) => state.store.get(key) ?? null,
  setItem: (key: string, value: string) => { state.store.set(key, value); },
  removeItem: (key: string) => { state.store.delete(key); },
};

beforeEach(() => {
  vi.clearAllMocks();
  state.native = false;
  state.server = false;
  state.effects = [];
  state.loaded = { share: false, haptics: false, biometric: false, app: false };
  state.store.clear();
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", localStorageStub);
  vi.stubGlobal("window", { location: { origin: "https://couplemetric.test" }, localStorage: localStorageStub });
  vi.stubGlobal("navigator", {});
});

describe("shareCard", () => {
  const payload = { title: "My score", text: "I scored 80/100", url: "https://couplemetric.test/share" };

  it("uses the native share sheet on Android without touching the web share API", async () => {
    state.native = true;
    const webShare = vi.fn();
    vi.stubGlobal("navigator", { share: webShare, clipboard: { writeText: vi.fn() } });
    expect(await shareCard(payload)).toBe("shared");
    expect(state.share).toHaveBeenCalledWith(expect.objectContaining(payload));
    expect(webShare).not.toHaveBeenCalled();
  });

  it("reports a cancelled native share without failing", async () => {
    state.native = true;
    state.share.mockRejectedValueOnce(new Error("Share canceled"));
    expect(await shareCard(payload)).toBe("cancelled");
  });

  it("prefers navigator.share on the web and never loads the native plugin", async () => {
    const webShare = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { share: webShare });
    expect(await shareCard(payload)).toBe("shared");
    expect(webShare).toHaveBeenCalledWith(payload);
    expect(state.loaded.share).toBe(false);
    expect(state.share).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when the web share API is unavailable", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await shareCard(payload)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(`${payload.text} ${payload.url}`);
  });

  it("falls back to the clipboard when the web share sheet is dismissed", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { share: vi.fn(async () => { throw new Error("AbortError"); }), clipboard: { writeText } });
    expect(await shareCard(payload)).toBe("copied");
    expect(writeText).toHaveBeenCalledOnce();
  });

  it("reports failure when neither sharing nor the clipboard work", async () => {
    vi.stubGlobal("navigator", {});
    expect(await shareCard(payload)).toBe("failed");
  });
});

describe("hapticScoreReveal", () => {
  it("fires a single medium impact on native", async () => {
    state.native = true;
    expect(await hapticScoreReveal()).toBe(true);
    expect(state.impact).toHaveBeenCalledOnce();
    expect(state.impact).toHaveBeenCalledWith({ style: "MEDIUM" });
  });

  it("does nothing on the web and never loads the plugin", async () => {
    expect(await hapticScoreReveal()).toBe(false);
    expect(state.impact).not.toHaveBeenCalled();
    expect(state.loaded.haptics).toBe(false);
  });

  it("swallows plugin failures", async () => {
    state.native = true;
    state.impact.mockRejectedValueOnce(new Error("not implemented"));
    expect(await hapticScoreReveal()).toBe(false);
  });
});

describe("biometric helpers", () => {
  it("is unavailable on the web without loading the plugin", async () => {
    expect(await isBiometricAvailable()).toBe(false);
    expect(await verifyIdentity("Unlock")).toBe(false);
    expect(state.loaded.biometric).toBe(false);
  });

  it("reports device availability on native", async () => {
    state.native = true;
    expect(await isBiometricAvailable()).toBe(true);
    state.isAvailable.mockResolvedValueOnce({ isAvailable: false, biometryType: 0 });
    expect(await isBiometricAvailable()).toBe(false);
    state.isAvailable.mockRejectedValueOnce(new Error("boom"));
    expect(await isBiometricAvailable()).toBe(false);
  });

  it("resolves true only when the native prompt succeeds", async () => {
    state.native = true;
    expect(await verifyIdentity("Unlock Couplemetric")).toBe(true);
    expect(state.verify).toHaveBeenCalledWith(expect.objectContaining({ reason: "Unlock Couplemetric", useFallback: true }));
    state.verify.mockRejectedValueOnce(new Error("Authentication failed"));
    expect(await verifyIdentity("Unlock Couplemetric")).toBe(false);
  });

  it("stores the lock preference under cm.biometricLock", () => {
    expect(BIOMETRIC_LOCK_KEY).toBe("cm.biometricLock");
    expect(isBiometricLockEnabled()).toBe(false);
    setBiometricLockEnabled(true);
    expect(state.store.get("cm.biometricLock")).toBe("1");
    expect(isBiometricLockEnabled()).toBe(true);
    setBiometricLockEnabled(false);
    expect(isBiometricLockEnabled()).toBe(false);
  });

  it("treats blocked storage as disabled", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
    expect(isBiometricLockEnabled()).toBe(false);
    expect(() => setBiometricLockEnabled(true)).not.toThrow();
  });
});

describe("BiometricLock", () => {
  type Listener = (s: { isActive: boolean }) => void;

  async function mountNative(prefOn: boolean): Promise<Listener> {
    state.native = true;
    if (prefOn) state.store.set("cm.biometricLock", "1");
    renderToStaticMarkup(React.createElement(BiometricLock));
    state.effects.forEach((effect) => effect());
    await flush();
    expect(state.addListener).toHaveBeenCalledWith("appStateChange", expect.any(Function));
    return (state.addListener.mock.calls[0] as unknown[])[1] as Listener;
  }

  it("renders nothing and registers nothing on the web", async () => {
    state.store.set("cm.biometricLock", "1");
    expect(renderToStaticMarkup(React.createElement(BiometricLock))).toBe("");
    state.effects.forEach((effect) => effect());
    await flush();
    expect(state.addListener).not.toHaveBeenCalled();
    expect(state.loaded.app).toBe(false);
    expect(state.verify).not.toHaveBeenCalled();
  });

  it("listens but never prompts on native while the preference is off", async () => {
    const listener = await mountNative(false);
    expect(state.verify).not.toHaveBeenCalled();
    listener({ isActive: false });
    listener({ isActive: true });
    await flush();
    expect(state.verify).not.toHaveBeenCalled();
  });

  it("verifies identity when the app returns to the foreground with the lock enabled", async () => {
    const listener = await mountNative(true);
    expect(state.verify).toHaveBeenCalledOnce(); // cold start
    state.verify.mockClear();
    listener({ isActive: false });
    await flush();
    expect(state.verify).not.toHaveBeenCalled();
    listener({ isActive: true });
    await flush();
    expect(state.verify).toHaveBeenCalledOnce();
  });

  it("does not re-prompt for the pause/resume caused by its own prompt activity (Android)", async () => {
    const listener = await mountNative(true);
    state.verify.mockClear();
    let resolvePrompt: () => void = () => {};
    state.verify.mockImplementationOnce(() => new Promise<undefined>((resolve) => { resolvePrompt = () => resolve(undefined); }));
    listener({ isActive: false });
    listener({ isActive: true });
    await flush();
    expect(state.verify).toHaveBeenCalledOnce();
    // The native AuthActivity pauses the bridge, resolves, then resumes it.
    listener({ isActive: false });
    resolvePrompt();
    await flush();
    listener({ isActive: true });
    await flush();
    expect(state.verify).toHaveBeenCalledOnce();
    // A genuine background/foreground afterwards still locks.
    listener({ isActive: false });
    listener({ isActive: true });
    await flush();
    expect(state.verify).toHaveBeenCalledTimes(2);
  });

  it("honours the preference when it is enabled after mount", async () => {
    const listener = await mountNative(false);
    state.store.set(BIOMETRIC_LOCK_KEY, "1");
    listener({ isActive: false });
    listener({ isActive: true });
    await flush();
    expect(state.verify).toHaveBeenCalledOnce();
  });

  it("stops prompting once the preference is disabled", async () => {
    const listener = await mountNative(true);
    state.verify.mockClear();
    state.store.delete(BIOMETRIC_LOCK_KEY);
    listener({ isActive: false });
    listener({ isActive: true });
    await flush();
    expect(state.verify).not.toHaveBeenCalled();
  });
});

describe("BiometricSettings", () => {
  it("renders nothing on the web and in server HTML", () => {
    expect(renderToStaticMarkup(React.createElement(BiometricSettings))).toBe("");
    state.server = true;
    state.native = true;
    expect(renderToStaticMarkup(React.createElement(BiometricSettings))).toBe("");
  });

  it("offers the biometric lock toggle on native", () => {
    state.native = true;
    const markup = renderToStaticMarkup(React.createElement(BiometricSettings));
    expect(markup).toMatch(/Biometric lock/i);
    expect(markup).toMatch(/role="switch"/);
  });
});

describe("ShareScore", () => {
  it("renders the share button with no platform-specific markup", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ShareScore, { totalQuality: 80, lifeScore: 70, relScore: 85, date: "2026-10-19" }),
    );
    expect(markup).toContain("Share Score");
    expect(state.loaded.share).toBe(false);
  });
});

describe("quiz ResultClient", () => {
  const props = {
    pulse: 80,
    interpretation: "Strong",
    dimensions: [{ label: "Emotional", value: 8 }],
    shareParam: "abc",
  };

  function mountAndRunEffects() {
    const markup = renderToStaticMarkup(React.createElement(ResultClient, props));
    const cleanups = state.effects.map((effect) => effect());
    cleanups.forEach((cleanup) => { if (typeof cleanup === "function") cleanup(); });
    return markup;
  }

  it("fires the score-reveal haptic exactly once per mount on native", async () => {
    state.native = true;
    mountAndRunEffects();
    await flush();
    expect(state.impact).toHaveBeenCalledOnce();
    expect(state.impact).toHaveBeenCalledWith({ style: "MEDIUM" });
  });

  it("never loads the haptics plugin on the web", async () => {
    mountAndRunEffects();
    await flush();
    expect(state.impact).not.toHaveBeenCalled();
    expect(state.loaded.haptics).toBe(false);
  });
});
