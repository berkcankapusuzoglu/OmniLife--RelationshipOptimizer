"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNativePlatform } from "@/lib/capacitor/platform";
import {
  isBiometricAvailable,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  verifyIdentity,
} from "@/lib/capacitor/biometric";

/**
 * Device-tab toggle for the biometric app lock. Native only: renders nothing
 * on the web and during server/hydration rendering.
 */
export function BiometricSettings() {
  const native = useNativePlatform();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(() => isBiometricLockEnabled());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!native) return;
    let cancelled = false;
    isBiometricAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [native]);

  if (!native) return null;

  async function handleChange(next: boolean) {
    setMessage(null);
    if (!next) {
      setBiometricLockEnabled(false);
      setEnabled(false);
      return;
    }
    setBusy(true);
    const ok = await verifyIdentity("Confirm it's you to turn on the app lock");
    setBusy(false);
    if (!ok) {
      setMessage("We couldn't verify it was you. The lock stays off.");
      return;
    }
    setBiometricLockEnabled(true);
    setEnabled(true);
  }

  const unavailable = available === false;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="biometric-lock">Biometric lock</Label>
          <p className="text-sm text-muted-foreground">
            Ask for your fingerprint or face each time you return to the app.
          </p>
        </div>
        <Switch
          id="biometric-lock"
          checked={enabled}
          disabled={busy || unavailable}
          onCheckedChange={(checked) => void handleChange(checked)}
        />
      </div>
      {unavailable && (
        <p className="text-xs text-muted-foreground">
          Biometric unlock isn&apos;t set up on this device.
        </p>
      )}
      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  );
}
