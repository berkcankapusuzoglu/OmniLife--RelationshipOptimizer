import { describe, it, expect } from "vitest";
import {
  DEFAULT_PREFERENCE,
  THEME_STORAGE_KEY,
  isThemePreference,
  readStoredPreference,
  resolveTheme,
  storePreference,
} from "@/lib/theme/preference";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const throwingStorage = {
  getItem() {
    throw new Error("SecurityError: storage disabled");
  },
  setItem() {
    throw new Error("SecurityError: storage disabled");
  },
};

// The default is deliberately "dark" rather than "system" until light mode has
// had a rendered verification pass; see src/lib/theme/preference.ts.
describe("isThemePreference", () => {
  it("accepts the three supported values and nothing else", () => {
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("Dark")).toBe(false);
    expect(isThemePreference("")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
  });
});

describe("readStoredPreference", () => {
  it("returns the stored preference", () => {
    const storage = memoryStorage({ [THEME_STORAGE_KEY]: "light" });
    expect(readStoredPreference(storage)).toBe("light");
  });

  it("falls back to system for an empty store", () => {
    expect(readStoredPreference(memoryStorage())).toBe(DEFAULT_PREFERENCE);
  });

  it("falls back to system for a corrupted value", () => {
    const storage = memoryStorage({ [THEME_STORAGE_KEY]: "neon" });
    expect(readStoredPreference(storage)).toBe(DEFAULT_PREFERENCE);
  });

  it("falls back to system when storage throws", () => {
    expect(readStoredPreference(throwingStorage)).toBe(DEFAULT_PREFERENCE);
  });

  it("falls back to system when there is no storage at all", () => {
    expect(readStoredPreference(null)).toBe(DEFAULT_PREFERENCE);
  });
});

describe("resolveTheme", () => {
  it("honours an explicit preference regardless of the system setting", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("follows the system setting under the system preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("storePreference", () => {
  it("writes the preference and reads back identically", () => {
    const storage = memoryStorage();
    expect(storePreference("dark", storage)).toBe(true);
    expect(readStoredPreference(storage)).toBe("dark");
  });

  it("reports failure instead of throwing when storage is unavailable", () => {
    expect(storePreference("dark", throwingStorage)).toBe(false);
    expect(storePreference("dark", null)).toBe(false);
  });
});
