import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { completeExercise } from "@/app/(dashboard)/exercises/actions";
import { activateScenario } from "@/app/(dashboard)/scenarios/actions";
import { addConstraint } from "@/app/(dashboard)/constraints/actions";
import { exportData } from "@/app/(dashboard)/settings/actions";
import { PremiumGate } from "@/components/premium-gate";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { TIERS } from "@/lib/subscription/tiers";

type Row = Record<string, unknown>;
type Write = { kind: "insert" | "update" | "delete"; table: string; values?: Row };
type Read = { table: string; where: string; params: unknown[] };

const state = vi.hoisted(() => ({
  tier: "free" as string,
  via: "none" as string,
  rows: {} as Record<string, Row[]>,
  reads: [] as { table: string; where: string; params: unknown[] }[],
  writes: [] as { kind: "insert" | "update" | "delete"; table: string; values?: Record<string, unknown> }[],
  revalidated: [] as string[],
}));
const platform = vi.hoisted(() => ({ native: false }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => { state.revalidated.push(path); } }));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => ({ id: "user-a", partnerId: "user-b" }) }));
vi.mock("@/lib/subscription/access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/subscription/access")>()),
  getUserTier: async () => state.tier,
  getEntitlement: async () => ({ tier: state.tier, via: state.via, expiresAt: null, source: null, ownerId: state.via === "partner" ? "user-b" : "user-a" }),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => platform.native, getPlatform: () => (platform.native ? "android" : "web") } }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot() };
});

// Fake Drizzle chain: compiled WHERE clauses are recorded so tests can assert
// ownership and time-window predicates; rows come from `state.rows[table]`.
vi.mock("@/lib/db", () => ({ getDb: () => {
  const dialect = new PgDialect();
  const compile = (predicate?: SQL) => predicate ? dialect.sqlToQuery(predicate) : { sql: "", params: [] as unknown[] };
  const read = (table: PgTable) => {
    let where: SQL | undefined;
    const builder = {
      where: (predicate: SQL) => { where = predicate; return builder; },
      orderBy: () => builder,
      limit: () => builder,
      then: (fulfilled: (rows: Row[]) => unknown, rejected?: (error: unknown) => unknown) => Promise.resolve().then(() => {
        const compiled = compile(where);
        state.reads.push({ table: getTableName(table), where: compiled.sql, params: compiled.params });
        return state.rows[getTableName(table)] ?? [];
      }).then(fulfilled, rejected),
    };
    return builder;
  };
  return {
    select: () => ({ from: read }),
    insert: (table: PgTable) => ({ values: async (values: Row) => { state.writes.push({ kind: "insert", table: getTableName(table), values }); } }),
    update: (table: PgTable) => ({ set: (values: Row) => ({ where: async () => { state.writes.push({ kind: "update", table: getTableName(table), values }); } }) }),
    delete: (table: PgTable) => ({ where: async () => { state.writes.push({ kind: "delete", table: getTableName(table) }); } }),
  };
} }));

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}
const exercise = { exerciseId: "gratitude-share", title: "Gratitude share", theoryBasis: "Positive psychology", targetDimension: "emotional", rating: 4 };
const writesTo = (table: string) => state.writes.filter((write: Write) => write.table === table);
const readsOf = (table: string) => state.reads.filter((read: Read) => read.table === table);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-19T12:00:00Z"));
  vi.stubGlobal("React", React);
  state.tier = "free"; state.via = "none";
  state.rows = { interventions: [{ count: 0 }], daily_logs: [], scenario_profiles: [{ id: "11111111-1111-4111-8111-111111111111" }] };
  state.reads = []; state.writes = []; state.revalidated = [];
  platform.native = false;
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const covered = [
  ["own", "premium", "own"],
  ["partner-inherited", "premium", "partner"],
  ["trial", "premium", "trial"],
  ["legacy pro", "pro", "own"],
] as const;

describe("completeExercise weekly limit", () => {
  it("refuses a free user who already completed the weekly limit and writes nothing", async () => {
    state.rows.interventions = [{ count: TIERS.free.features.exerciseLimit }];
    const result = await completeExercise(exercise);
    expect(result).toEqual({ error: expect.stringMatching(/week/i) });
    expect(writesTo("interventions")).toEqual([]);
    expect(state.revalidated).toEqual([]);
  });
  it("counts only this user's completions from the last seven days", async () => {
    state.rows.interventions = [{ count: 1 }];
    await completeExercise(exercise);
    const countRead = readsOf("interventions")[0];
    expect(countRead.where).toMatch(/"interventions"\."user_id" = \$\d/);
    expect(countRead.where).toMatch(/"interventions"\."created_at" >= \$\d/);
    expect(countRead.params).toContain("user-a");
    const since = countRead.params.find((value): value is Date => value instanceof Date)!;
    expect(since.toISOString()).toBe("2026-10-12T12:00:00.000Z");
  });
  it("records a completion while the free user is under the limit", async () => {
    state.rows.interventions = [{ count: TIERS.free.features.exerciseLimit - 1 }];
    expect(await completeExercise(exercise)).toEqual({ error: undefined });
    expect(writesTo("interventions")).toHaveLength(1);
    expect(writesTo("interventions")[0].values).toMatchObject({ userId: "user-a", type: "gratitude-share", wasCompleted: true });
    expect(state.revalidated).toEqual(["/exercises"]);
  });
  it.each(covered)("never limits a %s Premium entitlement", async (_label, tier, via) => {
    state.tier = tier; state.via = via;
    state.rows.interventions = [{ count: 500 }];
    expect(await completeExercise(exercise)).toEqual({ error: undefined });
    expect(writesTo("interventions")).toHaveLength(1);
  });
});

describe("activateScenario", () => {
  it("refuses a free user before any write", async () => {
    const result = await activateScenario("exam-mode", "exam");
    expect(result).toEqual({ error: expect.stringMatching(/premium/i) });
    expect(state.writes).toEqual([]);
    expect(state.revalidated).toEqual([]);
  });
  it.each(covered)("activates a preset for a %s entitlement", async (_label, tier, via) => {
    state.tier = tier; state.via = via;
    const result = await activateScenario("exam-mode", "exam");
    expect(result).toEqual({ error: undefined });
    expect(writesTo("scenario_profiles")).toHaveLength(1);
    expect(writesTo("users")).toHaveLength(1);
  });
});

describe("addConstraint", () => {
  const input = form({ name: "Sleep floor", type: "redline", dimension: "vitality", minValue: "4" });
  it("refuses a free user before any write", async () => {
    expect(await addConstraint(input)).toEqual({ error: expect.stringMatching(/premium/i) });
    expect(state.writes).toEqual([]);
  });
  it.each(covered)("stores the constraint for a %s entitlement", async (_label, tier, via) => {
    state.tier = tier; state.via = via;
    expect(await addConstraint(input)).toEqual({ error: undefined });
    expect(writesTo("constraints")[0].values).toMatchObject({ userId: "user-a", name: "Sleep floor", type: "redline", minValue: "4" });
  });
});

describe("exportData", () => {
  it("refuses a free user before reading any data", async () => {
    expect(await exportData()).toEqual({ error: expect.stringMatching(/premium/i) });
    expect(state.reads).toEqual([]);
  });
  it.each(covered)("returns the export for a %s entitlement", async (_label, tier, via) => {
    state.tier = tier; state.via = via;
    state.rows.daily_logs = [{ userId: "user-a", date: "2026-10-19" }];
    state.rows.scores = [{ userId: "user-a", date: "2026-10-19" }];
    state.rows.weekly_checkins = [];
    const result = await exportData();
    expect(result).toMatchObject({ dailyLogs: [{ date: "2026-10-19" }], scores: [{ date: "2026-10-19" }], weeklyCheckins: [] });
    expect("error" in result).toBe(false);
  });
});

describe("locked UI never leaks data or stale offers", () => {
  const locked = () => renderToStaticMarkup(React.createElement(PremiumGate, { userTier: "free", feature: "insights" }, React.createElement("p", null, "SECRET-SCORE-73")));

  it("renders a static illustration instead of blurred real content", () => {
    const markup = locked();
    expect(markup).not.toContain("SECRET-SCORE-73");
    expect(markup).not.toMatch(/blur/);
    expect(markup).toContain("<svg");
  });
  it("names Premium as the only upgrade path with the current web price", () => {
    const markup = locked();
    expect(markup).not.toMatch(/\bPro\b/);
    expect(markup).toContain(`$${TIERS.premium.monthlyPrice}`);
    expect(markup).toContain('href="/pricing"');
  });
  it("still renders children for every covered entitlement", () => {
    for (const [, tier] of covered) {
      const markup = renderToStaticMarkup(React.createElement(PremiumGate, { userTier: tier, feature: "insights" }, React.createElement("p", null, "Chart")));
      expect(markup).toBe("<p>Chart</p>");
    }
  });
  it("shows no price in the upgrade prompt on native", () => {
    platform.native = true;
    const markup = renderToStaticMarkup(React.createElement(UpgradePrompt, { featureDescription: "Guided exercises" }));
    expect(markup).not.toContain("$");
    expect(markup).not.toMatch(/upgrade/i);
  });
});
