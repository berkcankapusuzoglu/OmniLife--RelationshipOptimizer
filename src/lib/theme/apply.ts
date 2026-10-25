"use client";

import {
  readStoredPreference,
  resolveTheme,
  storePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "./preference";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Fired after a preference is stored so subscribers re-read it. `storage` only
 * fires in *other* tabs, so without this the control that made the change would
 * not see it.
 */
export const THEME_CHANGE_EVENT = "cm-theme-change";

/** Subscribe to preference changes, for useSyncExternalStore. */
export function subscribeToPreference(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function localStore() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Falls back to dark when matchMedia is missing or throws, matching the
// pre-paint script in <head>; otherwise the first paint and a later "system"
// selection could disagree.
export function systemPrefersDark(): boolean {
  try {
    if (typeof window.matchMedia !== "function") return true;
    return window.matchMedia(SYSTEM_DARK_QUERY).matches;
  } catch {
    return true;
  }
}

export function getPreference(): ThemePreference {
  return readStoredPreference(localStore());
}

// Mirrors the pre-paint inline script so a later change lands on the same DOM
// state the first paint produced.
export function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function setPreference(preference: ThemePreference): ResolvedTheme {
  storePreference(preference, localStore());
  const theme = resolveTheme(preference, systemPrefersDark());
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  return theme;
}

// Under "system" the OS can flip while the page is open.
export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(SYSTEM_DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
