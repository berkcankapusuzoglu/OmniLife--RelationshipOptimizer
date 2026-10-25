export const THEME_STORAGE_KEY = "couplemetric-theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const PREFERENCES: readonly string[] = ["system", "light", "dark"];

// Minimal slice of Storage so the pure logic can be tested without a DOM.
export type PreferenceStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
} | null;

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && PREFERENCES.includes(value);
}

/**
 * The default is "dark", not "system", on purpose.
 *
 * The app shipped dark-only, and the light theme has not yet been visually
 * verified -- the tokens are converted but components still carry hard-coded
 * literals, and contrast in light mode is reasoned rather than measured.
 * Defaulting to "system" would have silently moved every tester on a
 * light-mode phone onto that unverified theme in the middle of the closed
 * test. Light is opt-in until a rendered pass says otherwise; flipping this
 * default to "system" is then a one-line change.
 *
 * Private mode, blocked site data and previews all make localStorage throw or
 * come back empty; every one of those must land on the default, never a blank
 * page.
 */
export const DEFAULT_PREFERENCE: ThemePreference = "dark";

export function readStoredPreference(store: PreferenceStore): ThemePreference {
  try {
    const stored = store?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function storePreference(
  preference: ThemePreference,
  store: PreferenceStore,
): boolean {
  try {
    store?.setItem(THEME_STORAGE_KEY, preference);
    return store !== null && store !== undefined;
  } catch {
    return false;
  }
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}
