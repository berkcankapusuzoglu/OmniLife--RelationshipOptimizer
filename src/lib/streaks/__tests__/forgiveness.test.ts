import { describe, expect, it } from "vitest";

import {
  FORGIVENESS_WINDOW_DAYS,
  dayDifference,
  lastForgivenessDate,
  resolveStreak,
} from "../forgiveness";

describe("dayDifference", () => {
  it("counts calendar days across a month boundary", () => {
    expect(dayDifference("2026-01-31", "2026-02-01")).toBe(1);
  });

  it("counts calendar days across a DST transition without drifting", () => {
    // US DST starts 2026-03-08; naive local-time math would yield 0.96 days.
    expect(dayDifference("2026-03-07", "2026-03-08")).toBe(1);
    expect(dayDifference("2026-10-31", "2026-11-02")).toBe(2);
  });

  it("counts a leap day", () => {
    expect(dayDifference("2024-02-28", "2024-03-01")).toBe(2);
  });
});

describe("lastForgivenessDate", () => {
  it("returns null when every log is consecutive", () => {
    expect(
      lastForgivenessDate(["2026-03-01", "2026-03-02", "2026-03-03"], "2026-03-03")
    ).toBeNull();
  });

  it("returns the resume date of a single-day gap", () => {
    expect(
      lastForgivenessDate(["2026-03-01", "2026-03-03", "2026-03-04"], "2026-03-04")
    ).toBe("2026-03-03");
  });

  it("ignores gaps of two or more missed days, which reset instead of forgive", () => {
    expect(
      lastForgivenessDate(["2026-03-01", "2026-03-05"], "2026-03-05")
    ).toBeNull();
  });

  it("ignores gaps older than the rolling window", () => {
    expect(
      lastForgivenessDate(["2026-01-01", "2026-01-03"], "2026-03-01")
    ).toBeNull();
  });

  it("tolerates unsorted and duplicated dates", () => {
    expect(
      lastForgivenessDate(
        ["2026-03-04", "2026-03-01", "2026-03-03", "2026-03-03"],
        "2026-03-04"
      )
    ).toBe("2026-03-03");
  });
});

describe("resolveStreak", () => {
  const base = { currentStreak: 5, longestStreak: 9, recentLogDates: [] as string[] };

  it("starts a streak on the first log ever", () => {
    const result = resolveStreak({
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      logDate: "2026-03-01",
      recentLogDates: [],
    });
    expect(result).toMatchObject({ currentStreak: 1, longestStreak: 1, forgiven: false });
  });

  it("extends on consecutive days", () => {
    const result = resolveStreak({
      ...base,
      lastLogDate: "2026-03-01",
      logDate: "2026-03-02",
      recentLogDates: ["2026-02-26", "2026-02-27", "2026-02-28", "2026-03-01"],
    });
    expect(result).toMatchObject({ currentStreak: 6, longestStreak: 9, forgiven: false });
  });

  it("is a no-op for a same-day double log", () => {
    const result = resolveStreak({
      ...base,
      lastLogDate: "2026-03-01",
      logDate: "2026-03-01",
      recentLogDates: ["2026-03-01"],
    });
    expect(result).toMatchObject({ currentStreak: 5, longestStreak: 9, forgiven: false, changed: false });
  });

  it("forgives one missed day and keeps the streak alive", () => {
    const result = resolveStreak({
      ...base,
      lastLogDate: "2026-03-01",
      logDate: "2026-03-03",
      recentLogDates: ["2026-02-26", "2026-02-27", "2026-02-28", "2026-03-01"],
    });
    expect(result).toMatchObject({ currentStreak: 6, longestStreak: 9, forgiven: true });
  });

  it("resets when two consecutive days are missed", () => {
    const result = resolveStreak({
      ...base,
      lastLogDate: "2026-03-01",
      logDate: "2026-03-04",
      recentLogDates: ["2026-02-28", "2026-03-01"],
    });
    expect(result).toMatchObject({ currentStreak: 1, forgiven: false });
  });

  it("resets on a second missed day inside the rolling window", () => {
    const result = resolveStreak({
      currentStreak: 8,
      longestStreak: 9,
      lastLogDate: "2026-03-10",
      logDate: "2026-03-12",
      // 2026-03-03 already consumed this window's forgiveness.
      recentLogDates: ["2026-03-01", "2026-03-03", "2026-03-04", "2026-03-10"],
    });
    expect(result).toMatchObject({ currentStreak: 1, forgiven: false });
  });

  it("forgives again once the earlier forgiveness falls out of the window", () => {
    const result = resolveStreak({
      currentStreak: 8,
      longestStreak: 9,
      lastLogDate: "2026-04-10",
      logDate: "2026-04-12",
      recentLogDates: ["2026-03-01", "2026-03-03", "2026-04-09", "2026-04-10"],
    });
    expect(result).toMatchObject({ currentStreak: 9, forgiven: true });
  });

  it("uses exactly a 30-day rolling window measured from the new log", () => {
    const justInside = resolveStreak({
      currentStreak: 3,
      longestStreak: 3,
      lastLogDate: "2026-04-01",
      logDate: "2026-04-03",
      // forgiveness resumed on 2026-03-05: 29 days before the new log
      recentLogDates: ["2026-03-03", "2026-03-05", "2026-04-01"],
    });
    expect(justInside.forgiven).toBe(false);

    // Same history shifted so the earlier forgiveness resumed 31 days back:
    // outside the window, so a new one is available.
    const justOutside = resolveStreak({
      currentStreak: 3,
      longestStreak: 3,
      lastLogDate: "2026-04-03",
      logDate: "2026-04-05",
      recentLogDates: ["2026-03-03", "2026-03-05", "2026-04-03"],
    });
    expect(justOutside.forgiven).toBe(true);

    expect(FORGIVENESS_WINDOW_DAYS).toBe(30);
  });

  it("raises the longest streak when a forgiven day carries past the record", () => {
    const result = resolveStreak({
      currentStreak: 9,
      longestStreak: 9,
      lastLogDate: "2026-03-01",
      logDate: "2026-03-03",
      recentLogDates: ["2026-02-28", "2026-03-01"],
    });
    expect(result).toMatchObject({ currentStreak: 10, longestStreak: 10, forgiven: true });
  });

  it("treats a backdated log as a no-op rather than rewinding the streak", () => {
    const result = resolveStreak({
      ...base,
      lastLogDate: "2026-03-05",
      logDate: "2026-03-02",
      recentLogDates: ["2026-03-04", "2026-03-05"],
    });
    expect(result).toMatchObject({ currentStreak: 5, changed: false });
  });
});

describe("forgiveness with the current log already persisted", () => {
  // Production callers insert the daily_logs row before updating the streak,
  // so logDate is present in recentLogDates.
  it("ignores the date being logged when looking for a spent forgiveness", () => {
    expect(
      lastForgivenessDate(["2026-03-01", "2026-03-03"], "2026-03-03")
    ).toBeNull();
  });

  it("still forgives when the gap's own resume date is in the history", () => {
    const result = resolveStreak({
      currentStreak: 5,
      longestStreak: 9,
      lastLogDate: "2026-03-01",
      logDate: "2026-03-03",
      recentLogDates: ["2026-02-28", "2026-03-01", "2026-03-03"],
    });
    expect(result).toMatchObject({ currentStreak: 6, forgiven: true });
  });

  it("still resets when an earlier forgiveness is already spent", () => {
    const result = resolveStreak({
      currentStreak: 8,
      longestStreak: 9,
      lastLogDate: "2026-03-10",
      logDate: "2026-03-12",
      recentLogDates: ["2026-03-01", "2026-03-03", "2026-03-10", "2026-03-12"],
    });
    expect(result).toMatchObject({ currentStreak: 1, forgiven: false });
  });
});
