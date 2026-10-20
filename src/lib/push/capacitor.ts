"use client";

/**
 * Native push client. The plugin is dynamically imported so web bundles never
 * load native code; every entry point is a no-op off the native platform.
 * Permission is only ever requested from enablePushNotifications(), which the
 * post-first-log pre-prompt and the notification settings call explicitly.
 */

import { isNativePlatform } from "@/lib/capacitor/platform";

export type PushEnableResult = "granted" | "denied" | "unsupported";

const TOKEN_STORAGE_KEY = "cm.pushToken";
const REGISTRATION_TIMEOUT_MS = 15_000;

let currentToken: string | null = null;

function readStoredToken(): string | null {
  if (currentToken) return currentToken;
  try {
    currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    currentToken = null;
  }
  return currentToken;
}

function storeToken(token: string | null): void {
  currentToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // storage is a convenience only
  }
}

function platformName(): "android" | "ios" | "web" {
  try {
    const platform = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.();
    if (platform === "android" || platform === "ios") return platform;
  } catch {
    // fall through
  }
  return "android";
}

async function loadPlugin() {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return PushNotifications;
}

/** Waits for the plugin's `registration` event (or `registrationError`) while `register()` runs. */
async function registerForToken(push: Awaited<ReturnType<typeof loadPlugin>>): Promise<string | null> {
  let settle: (token: string | null) => void = () => {};
  const token = new Promise<string | null>(resolve => { settle = resolve; });
  const handles = await Promise.all([
    push.addListener("registration", (event: { value: string }) => settle(event.value || null)),
    push.addListener("registrationError", () => settle(null)),
  ]);
  const timer = setTimeout(() => settle(null), REGISTRATION_TIMEOUT_MS);
  try {
    await push.register();
    return await token;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    for (const handle of handles) {
      try { await handle?.remove?.(); } catch { /* ignore */ }
    }
  }
}

export async function enablePushNotifications(): Promise<PushEnableResult> {
  if (!isNativePlatform()) return "unsupported";
  try {
    const push = await loadPlugin();
    let { receive } = await push.checkPermissions();
    if (receive !== "granted" && receive !== "denied") {
      ({ receive } = await push.requestPermissions());
    }
    if (receive !== "granted") return "denied";

    const token = await registerForToken(push);
    if (!token) return "denied";

    const response = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: platformName() }),
    });
    if (!response.ok) return "denied";
    storeToken(token);
    return "granted";
  } catch {
    return "denied";
  }
}

export async function disablePushNotifications(): Promise<void> {
  if (!isNativePlatform()) return;
  const token = readStoredToken();
  try {
    // Always opt out server-side: the stored token may be missing on a second
    // device, after a reinstall or when WebView storage was cleared, and the
    // server-side opt-out is what stops reminders.
    await fetch("/api/push/register", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token ?? undefined }),
    });
    const push = await loadPlugin();
    await push.unregister();
  } catch {
    // best effort: the server-side opt-out is what stops reminders
  } finally {
    storeToken(null);
  }
}

/** Legacy startup entry point: never registers or asks for permission. */
export async function initPushNotifications(): Promise<null> {
  return null;
}
