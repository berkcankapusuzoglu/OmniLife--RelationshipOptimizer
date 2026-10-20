/**
 * Public, monitored support / privacy / account-deletion contact.
 *
 * Published on /privacy, /terms and /delete-account. Change it here only.
 */
export const SUPPORT_CONTACT_EMAIL = "info.llcluna@gmail.com";

export function supportMailto(subject?: string): string {
  const base = `mailto:${SUPPORT_CONTACT_EMAIL}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}
