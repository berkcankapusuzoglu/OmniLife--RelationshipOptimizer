// Public site origin for share links, OG images and footers. Safe on the
// client and the edge runtime: NEXT_PUBLIC_APP_URL is inlined at build time.
const FALLBACK_SITE_URL = "https://omnilife-relationship-optimizer.vercel.app";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  try {
    return new URL(raw || FALLBACK_SITE_URL).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

/** Host only (no scheme), for the small footer line on share cards. */
export function getSiteHost(): string {
  return new URL(getSiteUrl()).host;
}
