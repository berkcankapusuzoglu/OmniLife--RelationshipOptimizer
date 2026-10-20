"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { enablePushNotifications } from "@/lib/push/capacitor";

export const PUSH_PROMPTED_KEY = "cm.pushPrompted";

function alreadyPrompted(): boolean {
  try {
    return localStorage.getItem(PUSH_PROMPTED_KEY) === "1";
  } catch {
    return false;
  }
}

function markPrompted(): void {
  try {
    localStorage.setItem(PUSH_PROMPTED_KEY, "1");
  } catch {
    // storage unavailable: the prompt may show again after a later log, never on launch
  }
}

/** True when the post-first-log pre-prompt should be shown: native, first log, not yet asked. */
export function shouldShowPushPrePrompt(isFirstLog: boolean): boolean {
  return isFirstLog && isNativePlatform() && !alreadyPrompted();
}

/**
 * Soft ask shown once, right after the user's first daily log on the native
 * app. The system permission dialog only opens when the user taps "Turn on".
 */
export function NotificationPrePrompt({ isFirstLog, onDone }: { isFirstLog: boolean; onDone?: () => void }) {
  const [visible, setVisible] = useState(() => shouldShowPushPrePrompt(isFirstLog));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"granted" | "denied" | null>(null);

  if (!visible) return null;

  const finish = () => {
    markPrompted();
    setVisible(false);
    onDone?.();
  };

  const turnOn = async () => {
    setBusy(true);
    const result = await enablePushNotifications();
    setBusy(false);
    setStatus(result === "granted" ? "granted" : "denied");
    setTimeout(finish, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-preprompt-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
    >
      <div className="w-full max-w-sm rounded-2xl border bg-background p-6 shadow-xl">
        <h2 id="push-preprompt-title" className="mb-2 text-lg font-semibold">
          Keep your streak going?
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Get one daily reminder at the time you usually log. No marketing, and you can turn it off any time in Settings.
        </p>
        {status === "granted" && <p className="mb-4 text-sm text-green-600">Reminders are on.</p>}
        {status === "denied" && (
          <p className="mb-4 text-sm text-muted-foreground">No problem. You can enable reminders later in Settings.</p>
        )}
        <div className="flex flex-col gap-2">
          <Button onClick={turnOn} disabled={busy || status !== null}>
            {busy ? "Asking..." : "Turn on reminders"}
          </Button>
          <Button variant="ghost" onClick={finish} disabled={busy || status !== null}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
