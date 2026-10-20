import { isNativePlatform } from "./platform";

/** localStorage key for the per-device "require biometrics on resume" preference. */
export const BIOMETRIC_LOCK_KEY = "cm.biometricLock";

function storage(): Storage | undefined {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
    if (typeof window !== "undefined") return window.localStorage;
  } catch {
    // Blocked storage behaves like "disabled".
  }
  return undefined;
}

export function isBiometricLockEnabled(): boolean {
  try {
    return storage()?.getItem(BIOMETRIC_LOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setBiometricLockEnabled(enabled: boolean): void {
  try {
    const store = storage();
    if (!store) return;
    if (enabled) store.setItem(BIOMETRIC_LOCK_KEY, "1");
    else store.removeItem(BIOMETRIC_LOCK_KEY);
  } catch {
    // Blocked storage: the preference simply does not persist.
  }
}

/** Whether the device can prompt for biometrics. Always false on the web; the
 *  plugin is loaded lazily so web bundles never include native code. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable === true;
  } catch {
    return false;
  }
}

/** Prompt for biometrics (`useFallback` enables the device-credential fallback
 *  on iOS only; Android ignores it). Resolves `true`
 *  only when the user passed; any cancel, failure or lockout resolves `false`. */
export async function verifyIdentity(reason: string): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
    await NativeBiometric.verifyIdentity({
      reason,
      title: "Unlock Couplemetric",
      useFallback: true,
      maxAttempts: 3,
    });
    return true;
  } catch {
    return false;
  }
}
