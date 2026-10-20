import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DailyPage from "@/app/(dashboard)/daily/page";
import { submitDailyLog } from "@/app/(dashboard)/daily/actions";

/**
 * D-05: on signup day the onboarding self-assessment occupies the single daily
 * log. The already-logged screen must show the per-dimension values and offer
 * an Edit action; `/daily?edit=1` opens the wizard pre-filled; a second
 * submission replaces today's row and score instead of inserting a duplicate.
 */

type Row = Record<string, unknown>;

/** Minimal Drizzle-like fake: every select resolves to the next queued result. */
const fake = vi.hoisted(() => {
  const state = {
    selects: [] as Row[][],
    inserts: [] as { table: unknown; values: Row }[],
    updates: [] as { table: unknown; values: Row }[],
    deletes: [] as { table: unknown }[],
  };
  function chain(resolveTo: () => unknown) {
    const c: Record<string, unknown> = {};
    for (const m of ["from", "where", "limit", "orderBy", "set", "values"]) {
      c[m] = () => c;
    }
    c.then = (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
      Promise.resolve().then(resolveTo).then(onOk, onErr);
    return c;
  }
  const db = {
    select: () => chain(() => state.selects.shift() ?? []),
    insert: (table: unknown) => ({
      values: (values: Row) => {
        state.inserts.push({ table, values });
        return chain(() => []);
      },
    }),
    update: (table: unknown) => ({
      set: (values: Row) => {
        state.updates.push({ table, values });
        return chain(() => []);
      },
    }),
    delete: (table: unknown) => {
      state.deletes.push({ table });
      return chain(() => []);
    },
  };
  return { state, db };
});

const user = {
  id: "user-1",
  partnerId: null,
  alphaWeight: "0.5", betaWeight: "0.5",
  pillarVitalityWeight: "0.25", pillarGrowthWeight: "0.25", pillarSecurityWeight: "0.25", pillarConnectionWeight: "0.25",
  relEmotionalWeight: "0.2", relTrustWeight: "0.2", relFairnessWeight: "0.2", relStressWeight: "0.2", relAutonomyWeight: "0.2",
};

vi.mock("@/lib/db", () => ({ getDb: () => fake.db }));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => user }));
vi.mock("@/lib/auth/authorization", () => ({ linkedPartnerId: async () => null }));
vi.mock("@/lib/streaks", () => ({ updateStreak: async () => ({ currentStreak: 1, longestStreak: 1 }) }));
vi.mock("@/lib/analytics/track", () => ({ trackEvent: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/(dashboard)/daily/daily-client", () => ({
  DailyLogWizard: (props: Record<string, unknown>) => (
    <div data-testid="wizard" data-props={JSON.stringify(props)} />
  ),
}));

const today = new Date().toISOString().split("T")[0];
const onboardingLog = {
  id: "log-1", userId: "user-1", date: today,
  vitalityScore: 5, growthScore: 6, securityScore: 7, connectionScore: 4,
  emotionalScore: 8, trustScore: 3, fairnessScore: 5, stressScore: 2, autonomyScore: 9,
  mood: 5, energyLevel: 5, notes: "Initial assessment from onboarding", scenarioMode: null, createdAt: new Date(),
};
const todayScore = { lifeScore: "55.00", relScore: "66.00", totalQuality: "60.50" };

const input = {
  vitality: 7, growth: 7, security: 7, connection: 7,
  emotional: 7, trust: 7, fairness: 7, stress: 3, autonomy: 7,
  mood: 7, energyLevel: 7, notes: "refined",
};

beforeEach(() => {
  vi.stubGlobal("React", React);
  fake.state.selects = [];
  fake.state.inserts = [];
  fake.state.updates = [];
  fake.state.deletes = [];
});

describe("/daily on a day that already has a log", () => {
  it("shows every dimension value and an Edit action instead of a dead end", async () => {
    fake.state.selects = [[onboardingLog], [todayScore]];
    const html = renderToStaticMarkup(await DailyPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('href="/daily?edit=1"');
    expect(html).toContain("Edit Today");
    expect(html).toContain("onboarding self-assessment");
    for (const [label, value] of [["Vitality", 5], ["Trust", 3], ["Autonomy", 9], ["Stress", 2], ["Mood", 5]] as const) {
      expect(html).toMatch(new RegExp(`${label}</dt><dd[^>]*>${value}/10`));
    }
    expect(html).not.toContain("Initial assessment from onboarding");
  });

  it("opens the wizard pre-filled with today's values when ?edit=1", async () => {
    fake.state.selects = [[onboardingLog], [onboardingLog]];
    const html = renderToStaticMarkup(await DailyPage({ searchParams: Promise.resolve({ edit: "1" }) }));
    expect(html).toContain('data-testid="wizard"');
    const props = JSON.parse(html.match(/data-props="([^"]+)"/)![1].replace(/&quot;/g, '"'));
    expect(props.previousLogValues).toMatchObject({ vitality: 5, trust: 3, autonomy: 9, stress: 2, mood: 5, energy: 5 });
  });

  it("keeps the normal 'come back tomorrow' copy for an ordinary log", async () => {
    fake.state.selects = [[{ ...onboardingLog, notes: "Good day" }], [todayScore]];
    const html = renderToStaticMarkup(await DailyPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Come back tomorrow");
    expect(html).toContain("Good day");
    expect(html).toContain('href="/daily?edit=1"');
  });
});

describe("submitDailyLog", () => {
  it("replaces today's log and score in place when one already exists", async () => {
    fake.state.selects = [
      [{ id: "log-1" }], // existing log for today
      [], // constraints
      [], // recent logs (trend)
      [], // pending interventions
      [{ count: 1 }], [{ count: 0 }], [{ count: 0 }], // milestone counts
    ];
    const result = await submitDailyLog(input);
    expect(fake.state.updates).toHaveLength(1);
    expect(fake.state.updates[0].values).toMatchObject({ vitalityScore: 7, stressScore: 3, notes: "refined" });
    expect(fake.state.deletes).toHaveLength(1);
    // Only the recomputed score row is inserted; no duplicate daily log.
    expect(fake.state.inserts).toHaveLength(1);
    expect(fake.state.inserts[0].values).toMatchObject({ dailyLogId: "log-1", date: today });
    expect(result.isFirstLog).toBe(false);
    expect(result.milestones).toEqual([]);
  });

  it("inserts a new log and score when today is not logged yet", async () => {
    fake.state.selects = [[], [], [], [], [{ count: 1 }], [{ count: 0 }], [{ count: 0 }]];
    const result = await submitDailyLog(input);
    expect(fake.state.updates).toHaveLength(0);
    expect(fake.state.deletes).toHaveLength(0);
    expect(fake.state.inserts).toHaveLength(2);
    expect(fake.state.inserts[0].values).toMatchObject({ userId: "user-1", date: today, vitalityScore: 7 });
    expect(result.isFirstLog).toBe(true);
  });
});
