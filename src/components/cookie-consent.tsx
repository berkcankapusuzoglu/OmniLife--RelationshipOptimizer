"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "couplemetric-cookie-consent";
const CONSENT_EVENT = "couplemetric-cookie-consent-change";

/**
 * Focused step flows own their whole screen and pin their primary action to a
 * bottom bar. A floating notice on top of that bar covered "Start Quiz" /
 * "Next" and swallowed the taps on a phone (tester feedback 2026-10-23), so the
 * notice waits until the user is on an ordinary page. It is informational —
 * essential cookies only, nothing to opt out of — so deferring it costs nothing.
 */
export const CONSENT_SUPPRESSED_PREFIXES = ["/quiz", "/onboarding"] as const;

export function isConsentSuppressed(pathname: string): boolean {
  return CONSENT_SUPPRESSED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CONSENT_EVENT, onChange);
  };
}

export function CookieConsent() {
  const pathname = usePathname();
  const visible = useSyncExternalStore(
    subscribe,
    () => !localStorage.getItem(STORAGE_KEY),
    () => false
  );

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  if (!visible || isConsentSuppressed(pathname)) return null;

  return (
    <div className="safe-bottom fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg rounded-lg border border-border/60 bg-card px-4 py-3 shadow-lg sm:left-auto sm:right-6 sm:mx-0">
      <div className="flex items-center gap-3 text-sm">
        <p className="text-muted-foreground">
          We use essential cookies only for authentication. No tracking.
        </p>
        <button
          onClick={dismiss}
          className="h-11 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
