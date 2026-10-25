import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REVIEW_ASKED_KEY,
  REVIEW_LAST_DAY_KEY,
  REVIEW_LOG_COUNT_KEY,
  REVIEW_LOG_THRESHOLD,
  recordLogAndMaybeRequestReview,
  shouldRequestReview,
} from "../index";

const state = vi.hoisted(() => ({
  native: false,
  requestReview: vi.fn(async () => undefined),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => state.native },
}));
vi.mock("@capacitor-community/in-app-review", () => ({
  InAppReview: { requestReview: state.requestReview },
}));

function installStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  });
  return store;
}

function breakStorage() {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("storage disabled");
    },
  });
}

beforeEach(() => {
  state.native = true;
  state.requestReview.mockClear();
  state.requestReview.mockResolvedValue(undefined);
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "localStorage");
  vi.useRealTimers();
});

/** The counter is per calendar day, so tests must move the clock. */
function setDay(day: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${day}T12:00:00.000Z`));
}

describe("shouldRequestReview", () => {
  it("stays silent below the threshold", () => {
    expect(shouldRequestReview({ logCount: 1, alreadyAsked: false })).toBe(false);
    expect(
      shouldRequestReview({ logCount: REVIEW_LOG_THRESHOLD - 1, alreadyAsked: false }),
    ).toBe(false);
  });

  it("asks exactly at the threshold", () => {
    expect(shouldRequestReview({ logCount: REVIEW_LOG_THRESHOLD, alreadyAsked: false })).toBe(
      true,
    );
  });

  it("asks above the threshold when the ask never happened", () => {
    expect(shouldRequestReview({ logCount: 50, alreadyAsked: false })).toBe(true);
  });

  it("never asks twice", () => {
    expect(shouldRequestReview({ logCount: REVIEW_LOG_THRESHOLD, alreadyAsked: true })).toBe(
      false,
    );
    expect(shouldRequestReview({ logCount: 99, alreadyAsked: true })).toBe(false);
  });

  it("treats an unknown count as not yet earned", () => {
    expect(shouldRequestReview({ logCount: 0, alreadyAsked: false })).toBe(false);
    expect(shouldRequestReview({ logCount: Number.NaN, alreadyAsked: false })).toBe(false);
  });
});

describe("recordLogAndMaybeRequestReview", () => {
  it("counts days and only asks on the third one", async () => {
    const store = installStorage();

    setDay("2026-10-20");
    expect(await recordLogAndMaybeRequestReview()).toBe(false);
    setDay("2026-10-21");
    expect(await recordLogAndMaybeRequestReview()).toBe(false);
    expect(state.requestReview).not.toHaveBeenCalled();

    setDay("2026-10-22");
    expect(await recordLogAndMaybeRequestReview()).toBe(true);
    expect(state.requestReview).toHaveBeenCalledTimes(1);
    expect(store.get(REVIEW_ASKED_KEY)).toBe("1");
    expect(store.get(REVIEW_LOG_COUNT_KEY)).toBe("3");
    expect(store.get(REVIEW_LAST_DAY_KEY)).toBe("2026-10-22");

    setDay("2026-10-23");
    expect(await recordLogAndMaybeRequestReview()).toBe(false);
    expect(state.requestReview).toHaveBeenCalledTimes(1);
  });

  it("does not let same-day edits advance the count", async () => {
    const store = installStorage();
    setDay("2026-10-20");

    for (let i = 0; i < 5; i += 1) {
      expect(await recordLogAndMaybeRequestReview()).toBe(false);
    }

    expect(store.get(REVIEW_LOG_COUNT_KEY)).toBe("1");
    expect(state.requestReview).not.toHaveBeenCalled();
    expect(store.get(REVIEW_ASKED_KEY)).toBeUndefined();
  });

  it("is a no-op on the web", async () => {
    state.native = false;
    installStorage({ [REVIEW_LOG_COUNT_KEY]: "9" });

    expect(await recordLogAndMaybeRequestReview()).toBe(false);
    expect(state.requestReview).not.toHaveBeenCalled();
  });

  it("stays silent when storage is unavailable", async () => {
    breakStorage();

    expect(await recordLogAndMaybeRequestReview()).toBe(false);
    expect(state.requestReview).not.toHaveBeenCalled();
  });

  it("swallows a plugin failure and still never asks again", async () => {
    const store = installStorage({ [REVIEW_LOG_COUNT_KEY]: "2" });
    setDay("2026-10-22");
    state.requestReview.mockRejectedValueOnce(new Error("quota"));

    expect(await recordLogAndMaybeRequestReview()).toBe(false);
    expect(store.get(REVIEW_ASKED_KEY)).toBe("1");
  });
});
