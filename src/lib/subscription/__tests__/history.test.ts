import { describe, expect, it } from "vitest";
import { exercisesRemainingThisWeek, historyCutoff } from "@/lib/subscription/history";
import { TIERS } from "@/lib/subscription/tiers";

const now = new Date("2026-10-19T12:00:00Z");

describe("historyCutoff", () => {
  it("returns a YYYY-MM-DD string seven days back for free users", () => {
    expect(historyCutoff("free", now)).toBe("2026-10-12");
  });
  it("returns ninety days back for premium users", () => {
    expect(historyCutoff("premium", now)).toBe("2026-07-21");
  });
  it("returns an all-time cutoff for legacy pro (unlimited history)", () => {
    expect(TIERS.pro.features.historyDays).toBe(Infinity);
    expect(historyCutoff("pro", now)).toBe("1970-01-01");
  });
  it("follows TIERS so the gate cannot drift from the feature matrix", () => {
    const days = TIERS.free.features.historyDays;
    const expected = new Date(now);
    expected.setUTCDate(expected.getUTCDate() - days);
    expect(historyCutoff("free", now)).toBe(expected.toISOString().split("T")[0]);
  });
  it("never includes a timezone component", () => {
    expect(historyCutoff("free", now)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("exercisesRemainingThisWeek", () => {
  it("subtracts completed exercises from the free weekly limit", () => {
    expect(exercisesRemainingThisWeek("free", 0)).toBe(5);
    expect(exercisesRemainingThisWeek("free", 3)).toBe(2);
  });
  it("clamps at zero when the limit is reached or exceeded", () => {
    expect(exercisesRemainingThisWeek("free", 5)).toBe(0);
    expect(exercisesRemainingThisWeek("free", 9)).toBe(0);
  });
  it("is unlimited for premium and legacy pro", () => {
    expect(exercisesRemainingThisWeek("premium", 100)).toBe(Infinity);
    expect(exercisesRemainingThisWeek("pro", 100)).toBe(Infinity);
  });
});
