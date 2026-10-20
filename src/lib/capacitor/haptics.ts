import { isNativePlatform } from "./platform";

/** One medium impact for the score reveal. Resolves `true` only when the native
 *  plugin actually fired; the web is always a silent no-op. Callers guard "once
 *  per mount" with a ref. */
export async function hapticScoreReveal(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Medium });
    return true;
  } catch {
    return false;
  }
}
