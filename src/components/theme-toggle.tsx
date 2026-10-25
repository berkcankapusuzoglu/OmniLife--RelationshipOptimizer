"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThemePreference } from "@/lib/theme/preference";
import {
  applyTheme,
  getPreference,
  setPreference,
  subscribeToPreference,
  systemPrefersDark,
  watchSystemTheme,
} from "@/lib/theme/apply";
import { resolveTheme } from "@/lib/theme/preference";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  // The stored preference is unknown on the server, so the selected state only
  // appears after mount; the pre-paint script has already set the colours.
  // useSyncExternalStore rather than read-into-state-in-an-effect: localStorage
  // is an external store, and this is the pattern the repo already uses for it
  // (see cookie-consent.tsx).
  const preference = useSyncExternalStore<ThemePreference | null>(
    subscribeToPreference,
    getPreference,
    () => null
  );

  useEffect(() => {
    if (preference !== "system") return;
    return watchSystemTheme(() => applyTheme(resolveTheme("system", systemPrefersDark())));
  }, [preference]);

  function choose(value: ThemePreference) {
    setPreference(value);
  }

  return (
    <div role="group" aria-label="Theme" className="flex flex-wrap gap-2">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = preference === value;
        return (
          <Button
            key={value}
            type="button"
            variant={selected ? "default" : "outline"}
            aria-pressed={preference === null ? undefined : selected}
            onClick={() => choose(value)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        );
      })}
    </div>
  );
}
