import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: {
    currentStreak: 4,
    longestStreak: 7,
    lastLogDate: "2026-03-01" as string | null,
  } as Record<string, unknown> | undefined,
  logDates: [] as string[],
  updated: null as Record<string, unknown> | null,
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: (fields: Record<string, unknown>) => ({
      from: () => ({
        where: () => {
          // The user row query is the only one that limits to a single row.
          const rows = "date" in fields ? state.logDates.map((date) => ({ date })) : [state.user];
          return Object.assign(Promise.resolve(rows), {
            limit: () => Promise.resolve(rows),
            orderBy: () => Promise.resolve(rows),
          });
        },
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          state.updated = values;
          return Promise.resolve();
        },
      }),
    }),
  }),
}));

const { updateStreak } = await import("../index");

describe("updateStreak", () => {
  beforeEach(() => {
    state.updated = null;
    state.user = { currentStreak: 4, longestStreak: 7, lastLogDate: "2026-03-01" };
    state.logDates = ["2026-02-27", "2026-02-28", "2026-03-01"];
  });

  it("extends the streak on a consecutive day", async () => {
    await expect(updateStreak("u1", "2026-03-02")).resolves.toMatchObject({
      currentStreak: 5,
      longestStreak: 7,
      forgiven: false,
    });
    expect(state.updated).toMatchObject({ currentStreak: 5, lastLogDate: "2026-03-02" });
  });

  it("forgives a single missed day instead of resetting", async () => {
    await expect(updateStreak("u1", "2026-03-03")).resolves.toMatchObject({
      currentStreak: 5,
      forgiven: true,
    });
  });

  it("resets after two missed days", async () => {
    await expect(updateStreak("u1", "2026-03-04")).resolves.toMatchObject({
      currentStreak: 1,
      forgiven: false,
    });
  });

  it("resets when the window's forgiveness was already spent", async () => {
    state.user = { currentStreak: 6, longestStreak: 7, lastLogDate: "2026-03-10" };
    state.logDates = ["2026-03-01", "2026-03-03", "2026-03-04", "2026-03-10"];
    await expect(updateStreak("u1", "2026-03-12")).resolves.toMatchObject({
      currentStreak: 1,
      forgiven: false,
    });
  });

  it("writes nothing for a same-day second log", async () => {
    await expect(updateStreak("u1", "2026-03-01")).resolves.toMatchObject({
      currentStreak: 4,
      longestStreak: 7,
    });
    expect(state.updated).toBeNull();
  });

  it("returns zeroes when the user row is missing", async () => {
    state.user = undefined;
    await expect(updateStreak("u1", "2026-03-02")).resolves.toMatchObject({
      currentStreak: 0,
      longestStreak: 0,
    });
  });
});

describe("updateStreak with the log row already written", () => {
  beforeEach(() => {
    state.updated = null;
  });

  it("forgives a missed day even though logDate is in daily_logs", async () => {
    state.user = { currentStreak: 4, longestStreak: 7, lastLogDate: "2026-03-01" };
    state.logDates = ["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-03"];
    await expect(updateStreak("u1", "2026-03-03")).resolves.toMatchObject({
      currentStreak: 5,
      forgiven: true,
    });
  });
});
