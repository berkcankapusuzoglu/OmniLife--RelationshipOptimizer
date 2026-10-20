"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Pathnames where "Back" has nowhere sensible to go. */
export const BACK_BUTTON_HIDDEN_PATHS = new Set(["/"]);

/**
 * Pure decision helper: go back through history when the tab has a previous
 * entry, otherwise fall back to the landing page (deep links, fresh tabs).
 */
export function resolveBackNavigation(historyLength: number): { kind: "back" } | { kind: "push"; href: "/" } {
  return historyLength > 1 ? { kind: "back" } : { kind: "push", href: "/" };
}

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  if (BACK_BUTTON_HIDDEN_PATHS.has(pathname)) return null;

  const handleClick = () => {
    const target = resolveBackNavigation(typeof window === "undefined" ? 0 : window.history.length);
    if (target.kind === "back") router.back();
    else router.push(target.href);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ChevronLeft className="h-4 w-4" />
      Back
    </button>
  );
}
