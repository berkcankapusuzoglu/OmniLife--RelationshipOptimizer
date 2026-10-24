import { describe, expect, it } from "vitest";
import { applyQuizPrefill, QUIZ_PREFILL_MAX_AGE_DAYS } from "@/lib/quiz/prefill";
import type { StoredQuizResult } from "@/lib/quiz";

/**
 * The quiz already saves its answers to localStorage and `loadQuizScores()` has
 * always existed — but onboarding never called it. Someone answered 5 questions,
 * signed up, and was immediately asked the same 5 things again, which is friction
 * at the highest-intent moment in the funnel. This is the missing bridge.
 */

const defaults = () =>
  Object.fromEntries(
    ["vitality", "growth", "security", "connection", "emotional", "trust", "fairness", "stress", "autonomy"].map(
      (k) => [k, 5]
    )
  );

const stored = (overrides: Partial<StoredQuizResult> = {}): StoredQuizResult => ({
  scores: { emotional: 8, fairness: 3, trust: 9, growth: 6, stress: 2 },
  pulse: 61,
  archetype: "Steady Partners",
  takenAt: new Date().toISOString(),
  ...overrides,
});

describe("applyQuizPrefill", () => {
  it("returns the defaults untouched when there is no stored quiz", () => {
    expect(applyQuizPrefill(defaults(), null)).toEqual(defaults());
  });

  it("overlays the five quiz dimensions onto the defaults", () => {
    const result = applyQuizPrefill(defaults(), stored());
    expect(result).toMatchObject({
      emotional: 8,
      fairness: 3,
      trust: 9,
      growth: 6,
      stress: 2,
    });
  });

  it("leaves the dimensions the quiz does not ask about at their default", () => {
    const result = applyQuizPrefill(defaults(), stored());
    for (const key of ["vitality", "security", "connection", "autonomy"]) {
      expect(result[key]).toBe(5);
    }
  });

  it("does not mutate the defaults it was given", () => {
    const base = defaults();
    applyQuizPrefill(base, stored());
    expect(base.emotional).toBe(5);
  });

  it("ignores a quiz older than the freshness window", () => {
    const stale = new Date(
      Date.now() - (QUIZ_PREFILL_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(applyQuizPrefill(defaults(), stored({ takenAt: stale }))).toEqual(defaults());
  });

  it("accepts a quiz taken just inside the freshness window", () => {
    const fresh = new Date(
      Date.now() - (QUIZ_PREFILL_MAX_AGE_DAYS - 1) * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(applyQuizPrefill(defaults(), stored({ takenAt: fresh })).emotional).toBe(8);
  });

  it("ignores an unparseable or missing timestamp rather than trusting it", () => {
    expect(applyQuizPrefill(defaults(), stored({ takenAt: "" }))).toEqual(defaults());
    expect(applyQuizPrefill(defaults(), stored({ takenAt: "not a date" }))).toEqual(defaults());
  });

  it("skips a score outside the 1-10 range instead of writing it through", () => {
    const bad = stored();
    (bad.scores as Record<string, number>).emotional = 99;
    const result = applyQuizPrefill(defaults(), bad);
    expect(result.emotional).toBe(5);
    expect(result.trust).toBe(9);
  });
});
