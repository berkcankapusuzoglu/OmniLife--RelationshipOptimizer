"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "omnilife-cookie-consent";
const CONSENT_EVENT = "omnilife-cookie-consent-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CONSENT_EVENT, onChange);
  };
}

export function CookieConsent() {
  const visible = useSyncExternalStore(
    subscribe,
    () => !localStorage.getItem(STORAGE_KEY),
    () => false
  );

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-lg border border-border/60 bg-card px-4 py-3 shadow-lg sm:left-auto sm:right-6 sm:mx-0">
      <div className="flex items-center gap-3 text-sm">
        <p className="text-muted-foreground">
          We use essential cookies only for authentication. No tracking.
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
