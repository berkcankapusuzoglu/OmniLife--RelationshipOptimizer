"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "omnilife-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
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
