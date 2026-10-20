"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint } from "lucide-react";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { isBiometricLockEnabled, verifyIdentity } from "@/lib/capacitor/biometric";

const UNLOCK_REASON = "Unlock Couplemetric";

/**
 * Native-only app lock. When the `cm.biometricLock` preference is on, every
 * return to the foreground covers the app with an opaque overlay until the
 * biometric prompt succeeds. Renders nothing on the web and in server HTML.
 *
 * The preference is read at event time, so toggling it in Settings takes
 * effect without restarting the app. On Android the biometric prompt runs in
 * its own activity, which pauses and resumes the WebView around every prompt;
 * only a background observed while no prompt was open counts as leaving the
 * app, otherwise the lock would re-prompt forever.
 */
export function BiometricLock() {
  const [locked, setLocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const verifying = useRef(false);
  const backgroundedWhileIdle = useRef(false);

  const unlock = useCallback(async () => {
    if (verifying.current) return;
    verifying.current = true;
    setFailed(false);
    const ok = await verifyIdentity(UNLOCK_REASON);
    verifying.current = false;
    if (ok) setLocked(false);
    else setFailed(true);
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) return;

    let handle: { remove: () => Promise<void> | void } | undefined;
    let disposed = false;

    const lockAndVerify = () => {
      if (!isBiometricLockEnabled()) return;
      setLocked(true);
      void unlock();
    };

    // Cold start: the app is already active, so lock immediately.
    lockAndVerify();

    import("@capacitor/app")
      .then(async ({ App }) => {
        const listener = await App.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) {
            if (!verifying.current) backgroundedWhileIdle.current = true;
            return;
          }
          if (!backgroundedWhileIdle.current) return;
          backgroundedWhileIdle.current = false;
          lockAndVerify();
        });
        if (disposed) void listener.remove();
        else handle = listener;
      })
      .catch(() => {});

    return () => {
      disposed = true;
      void handle?.remove();
    };
  }, [unlock]);

  if (!locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Locked"
      className="fixed inset-0 z-[100] flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-6 text-center"
    >
      <Fingerprint className="h-12 w-12 text-primary" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-lg font-semibold">Couplemetric is locked</p>
        <p className="text-sm text-muted-foreground">
          {failed ? "We couldn't verify it was you. Try again." : "Verify it's you to continue."}
        </p>
      </div>
      <Button onClick={unlock} className="w-full max-w-xs">
        Unlock
      </Button>
    </div>
  );
}
