import { isNativePlatform } from "./platform";

export interface ShareCardInput {
  title: string;
  text: string;
  url: string;
}

/** "shared": a share sheet completed; "cancelled": the native sheet was dismissed;
 *  "copied": the web fallback put the text on the clipboard; "failed": nothing worked. */
export type ShareCardResult = "shared" | "cancelled" | "copied" | "failed";

/** Share a score card. Native uses the OS share sheet (plugin loaded lazily so web
 *  bundles never include it); the web tries `navigator.share` then the clipboard. */
export async function shareCard(input: ShareCardInput): Promise<ShareCardResult> {
  if (isNativePlatform()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ ...input, dialogTitle: input.title });
      return "shared";
    } catch {
      return "cancelled";
    }
  }

  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (nav && typeof nav.share === "function") {
    try {
      await nav.share({ title: input.title, text: input.text, url: input.url });
      return "shared";
    } catch {
      // Dismissed or unsupported payload: fall through to the clipboard.
    }
  }

  try {
    if (!nav?.clipboard) return "failed";
    await nav.clipboard.writeText(`${input.text} ${input.url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
