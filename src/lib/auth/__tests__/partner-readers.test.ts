import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTableColumns, getTableName, type SQL } from "drizzle-orm";
import { PgDialect, type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core";
import PartnerDashboardPage from "@/app/(dashboard)/partner/dashboard/page";
import { PartnerDashboardClient } from "@/app/(dashboard)/partner/dashboard/partner-dashboard-client";
import InsightsPage from "@/app/(dashboard)/insights/page";
import { InsightsClient } from "@/app/(dashboard)/insights/insights-client";
import { getPartnerData } from "@/app/(dashboard)/compare/actions";

type Row = Record<string, unknown>;
type Read = { table: string; fields: string[]; count: number; limit: number; params: unknown[] };
const state = vi.hoisted(() => ({
  actor: { id: "A", name: "Alice", partnerId: "B" as string | null },
  rows: {} as Record<string, Row[]>,
  reads: [] as Read[],
  db: null as unknown,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDb: () => state.db }));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => state.actor }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`Redirect:${path}`); } }));
vi.mock("@/app/(dashboard)/insights/insights-client", () => ({ InsightsClient: () => null }));

type ReadBuilder = PromiseLike<Row[]> & {
  where: (predicate: SQL) => ReadBuilder;
  leftJoin: (aliasTable: PgTable, on: SQL) => ReadBuilder;
  orderBy: (...order: SQL[]) => ReadBuilder;
  limit: (count: number) => ReadBuilder;
};

// Replace only the external DB: compile real predicates and project actual rows.
// Recording the returned columns tests the query's privacy boundary, not source text.
function readDb() {
  const dialect = new PgDialect();
  return { select: (projection?: Record<string, AnyPgColumn>) => ({ from: (table: PgTable) => {
    const columns = getTableColumns(table);
    let predicate: SQL | undefined;
    let limit = Infinity;
    let descending = false;
    // Left join on an aliased table (`alias(users, "partner")`): the ON predicate
    // is compiled and evaluated per candidate row, so a one-way link yields null.
    let join: { alias: PgTable; on: SQL } | undefined;
    const fieldFor = (column: string) => Object.keys(columns).find((key) => columns[key].name === column)!;
    const joined = (row: Row): Row | null => {
      if (!join) return null;
      const on = dialect.sqlToQuery(join.on);
      const aliasName = getTableName(join.alias);
      const original = (join.alias as unknown as Record<symbol, string>)[Symbol.for("drizzle:OriginalName")];
      const expression = on.sql
        .replace(/"([^"]+)"\."([^"]+)"/g, (_, tableName, column) => `scope[${JSON.stringify(tableName)}][${JSON.stringify(fieldFor(column))}]`)
        .replace(/\$(\d+)/g, (_, index) => JSON.stringify(on.params[Number(index) - 1]))
        .replace(/(?<![<>!=])=(?!=)/g, "===").replace(/\band\b/gi, "&&");
      const test = Function("scope", `return (${expression})`) as (scope: Record<string, Row>) => boolean;
      return (state.rows[original] ?? []).find((candidate) => test({ [getTableName(table)]: row, [aliasName]: candidate })) ?? null;
    };
    const execute = () => {
      const query = predicate ? dialect.sqlToQuery(predicate) : null;
      if (query && /\bor\b/i.test(query.sql)) throw new Error("Unexpected OR in reader fixture");
      const comparisons = query ? [...query.sql.matchAll(/"[^"]+"\."([^"]+)" (>=|=) \$(\d+)/g)] : [];
      const rows = (state.rows[getTableName(table)] ?? []).filter((row) => comparisons.every(([, column, operator, parameter]) => {
        const field = Object.keys(columns).find((key) => columns[key].name === column)!;
        const value = row[field];
        const bound = query!.params[Number(parameter) - 1];
        return operator === "=" ? value === bound : typeof value === "string" && typeof bound === "string" && value >= bound;
      }));
      if (descending) rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      const selected = rows.slice(0, limit);
      const fields = projection ?? columns;
      state.reads.push({ table: getTableName(table), fields: Object.keys(fields), count: selected.length, limit, params: query?.params ?? [] });
      return selected.map((row) => {
        const scope: Record<string, Row | null> = { [getTableName(table)]: row, ...(join ? { [getTableName(join.alias)]: joined(row) } : {}) };
        return Object.fromEntries(Object.entries(fields).map(([name, column]) => {
          const { table: owner, name: columnName } = column as { table: PgTable; name: string };
          return [name, scope[getTableName(owner)]?.[fieldFor(columnName)] ?? null];
        }));
      });
    };
    const builder: ReadBuilder = {
      where: (value) => { predicate = value; return builder; },
      leftJoin: (aliasTable, on) => { join = { alias: aliasTable, on }; return builder; },
      orderBy: () => { descending = true; return builder; },
      limit: (value) => { limit = value; return builder; },
      then: (fulfilled, rejected) => Promise.resolve().then(execute).then(fulfilled, rejected),
    };
    return builder;
  } }) };
}

function clientProps<T>(node: React.ReactNode, component: React.ElementType): T {
  if (React.isValidElement(node)) {
    if (node.type === component) return node.props as T;
    const children = (node.props as { children?: React.ReactNode }).children;
    for (const child of React.Children.toArray(children)) {
      try { return clientProps<T>(child, component); } catch { /* Continue to the next subtree. */ }
    }
  }
  throw new Error("Client props not found");
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
  vi.stubGlobal("React", React);
  state.actor = { id: "A", name: "Alice", partnerId: "B" };
  state.reads = [];
  state.rows = {
    users: [
      { id: "B", name: "Bob", partnerId: "A", email: "private@example.test", passwordHash: "private-password" },
      { id: "A", name: "Alice", partnerId: "B", subscriptionTier: "premium", subscriptionExpiresAt: new Date("2026-11-14T00:00:00Z"), trialEndsAt: null },
    ],
    scores: [
      { userId: "A", date: "2026-10-14", lifeScore: "70", relScore: "60", totalQuality: "65", weightsSnapshot: "private-weights" },
      { userId: "B", date: "2026-10-14", lifeScore: "80", relScore: "72", totalQuality: "76", constraintViolations: "private-violations" },
      { userId: "B", date: "2026-10-01", lifeScore: "40", relScore: "42", totalQuality: "41" },
    ],
    daily_logs: [
      { userId: "A", date: "2026-10-14", emotionalScore: 3, trustScore: 5, fairnessScore: 5, stressScore: 5, autonomyScore: 4, notes: "Alice private journal", mood: 1, energyLevel: 2 },
      { userId: "B", date: "2026-10-14", emotionalScore: 9, trustScore: 8, fairnessScore: 5, stressScore: 5, autonomyScore: 4, notes: "Bob private journal", mood: 9, energyLevel: 10 },
      { userId: "B", date: "2026-10-01", emotionalScore: 1, trustScore: 1, fairnessScore: 1, stressScore: 1, autonomyScore: 1, notes: "Older private journal" },
    ],
    constraints: [],
  };
  state.db = readDb();
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("partner dashboard authorization and selected data", () => {
  it("renders the intended latest scores, dimensions and divergences for a reciprocal partner", async () => {
    const page = await PartnerDashboardPage();
    const props = clientProps<React.ComponentProps<typeof PartnerDashboardClient>>(page, PartnerDashboardClient);
    expect(props.partnerName).toBe("Bob");
    expect(props.userScoreCard).toEqual({ lifeScore: 70, relScore: 60, totalQuality: 65, date: "2026-10-14" });
    expect(props.partnerScoreCard).toEqual({ lifeScore: 80, relScore: 72, totalQuality: 76, date: "2026-10-14" });
    expect(props.partnerDimScores).toEqual({ emotional: 9, trust: 8, fairness: 5, stress: 5, autonomy: 4 });
    expect(props.divergences).toEqual([
      { dimension: "emotional", userScore: 3, partnerScore: 9, difference: 6 },
      { dimension: "trust", userScore: 5, partnerScore: 8, difference: 3 },
    ]);
    const html = renderToStaticMarkup(page);
    expect(html).toContain("Bob"); expect(html).toContain("76.0"); expect(html).toContain("Divergence Alerts");
    expect(html).not.toContain("private");
  });

  it.each([null, "C", "deleted"])("discloses nothing when the counterpart backlink is %s", async (backlink) => {
    if (backlink === "deleted") state.rows.users = [];
    else state.rows.users[0].partnerId = backlink;
    await expect(PartnerDashboardPage()).rejects.toThrow(/^Redirect:\/partner$/);
    expect(state.reads.map((read) => read.table)).toEqual(["users"]);
  });

  it("redirects an unlinked user before any DB read", async () => {
    state.actor.partnerId = null;
    await expect(PartnerDashboardPage()).rejects.toThrow(/^Redirect:\/partner$/);
    expect(state.reads).toEqual([]);
  });

  it("loads only the displayed profile fields and one row of displayed scores/dimensions", async () => {
    await PartnerDashboardPage();
    expect(state.reads[0].fields.sort()).toEqual(["id", "name"]);
    for (const read of state.reads.slice(1)) {
      const allowed = read.table === "scores"
        ? ["date", "lifeScore", "relScore", "totalQuality"]
        : ["autonomyScore", "emotionalScore", "fairnessScore", "stressScore", "trustScore"];
      expect(read.fields.sort()).toEqual(allowed.sort());
      expect(read.limit).toBe(1); expect(read.count).toBe(1);
    }
  });

  it("uses the partner label without exposing email when a partner has no name", async () => {
    state.rows.users[0].name = null;
    expect(renderToStaticMarkup(await PartnerDashboardPage())).not.toContain("private@example.test");
  });
});

describe("insights partner history authorization", () => {
  beforeEach(() => { state.rows.daily_logs = []; });

  it("preserves displayed partner score history for a reciprocal link and loads only its three fields", async () => {
    const props = clientProps<{ partnerPoints?: unknown }>(await InsightsPage(), InsightsClient);
    expect(props.partnerPoints).toEqual([
      { lifeScore: 80, relScore: 72, date: "2026-10-14" },
      { lifeScore: 40, relScore: 42, date: "2026-10-01" },
    ]);
    const partnerRead = state.reads.find((read) => read.table === "scores" && read.params.includes("B"))!;
    expect(partnerRead.fields.sort()).toEqual(["date", "lifeScore", "relScore"]);
  });

  it.each([null, "C", "deleted"])("omits partner history and skips the partner-score read for backlink %s", async (backlink) => {
    if (backlink === "deleted") state.rows.users = [];
    else state.rows.users[0].partnerId = backlink;
    const props = clientProps<{ partnerPoints?: unknown }>(await InsightsPage(), InsightsClient);
    expect(props.partnerPoints).toBeUndefined();
    expect(state.reads.filter((read) => read.table === "scores" && read.params.includes("B"))).toEqual([]);
  });
});

describe("Compare partner projections and reciprocal access", () => {
  beforeEach(() => {
    Object.assign(state.rows.daily_logs[1], { vitalityScore: 7, growthScore: 6, securityScore: 8, connectionScore: 9 });
  });

  it("returns the displayed reciprocal partner scores/dimensions and selects only their fields", async () => {
    const result = await getPartnerData(30);
    expect(result.partner).toEqual({ id: "B", name: "Bob" });
    expect(result.scores[0]).toEqual({ date: "2026-10-14", lifeScore: 80, relScore: 72, totalQuality: 76 });
    expect(result.logs[0]).toEqual({ date: "2026-10-14", vitalityScore: 7, growthScore: 6, securityScore: 8, connectionScore: 9, emotionalScore: 9, trustScore: 8, fairnessScore: 5, stressScore: 5, autonomyScore: 4 });
    const scoreRead = state.reads.find((read) => read.table === "scores")!;
    const logRead = state.reads.find((read) => read.table === "daily_logs")!;
    expect(scoreRead.fields.sort()).toEqual(["date", "lifeScore", "relScore", "totalQuality"]);
    expect(logRead.fields.sort()).toEqual(["autonomyScore", "connectionScore", "date", "emotionalScore", "fairnessScore", "growthScore", "securityScore", "stressScore", "trustScore", "vitalityScore"]);
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it.each(["missing", "unilateral", "stale", "deleted"])("returns no partner data or score/log reads for a %s link", async (link) => {
    if (link === "missing") state.actor.partnerId = null;
    else if (link === "deleted") state.rows.users = [];
    else state.rows.users[0].partnerId = link === "unilateral" ? null : "C";
    expect(await getPartnerData(30)).toEqual({ partner: null, scores: [], logs: [] });
    expect(state.reads.filter((read) => read.table === "scores" || read.table === "daily_logs")).toEqual([]);
  });
});

describe("Compare server-side entitlement window", () => {
  beforeEach(() => {
    const dates = ["2026-10-14", "2026-10-07", "2026-10-06", "2026-09-14", "2026-09-13", "2026-01-01"];
    state.rows.scores = dates.map((date) => ({ userId: "B", date, lifeScore: "80", relScore: "72", totalQuality: "76" }));
    state.rows.daily_logs = dates.map((date) => ({ userId: "B", date, vitalityScore: 7, growthScore: 6, securityScore: 8, connectionScore: 9, emotionalScore: 9, trustScore: 8, fairnessScore: 5, stressScore: 5, autonomyScore: 4, notes: "Private journal" }));
  });

  it.each([365, 31, 8, 1, 0, -1, Infinity, NaN, "30", null])("rejects unsupported caller window %s before partner-history reads", async (requested) => {
    await expect(getPartnerData(requested as number)).rejects.toThrow();
    expect(state.reads.filter((read) => read.table === "scores" || read.table === "daily_logs")).toEqual([]);
  });

  it.each(["free", "pro", "expired-paid", "expired-trial"])("caps a requested paid window to seven days for effective entitlement %s", async (entitlement) => {
    const viewer = state.rows.users[1];
    viewer.subscriptionTier = entitlement === "expired-paid" ? "premium" : entitlement === "expired-trial" ? "free" : entitlement;
    viewer.subscriptionExpiresAt = entitlement === "expired-paid" ? new Date("2026-10-13T00:00:00Z") : null;
    viewer.trialEndsAt = entitlement === "expired-trial" ? new Date("2026-10-13T00:00:00Z") : null;
    const result = await getPartnerData(30);
    expect(result.scores.map((score) => score.date)).toEqual(["2026-10-14", "2026-10-07"]);
    expect(result.logs.map((log) => log.date)).toEqual(["2026-10-14", "2026-10-07"]);
  });

  it.each(["free", "expired-paid"])("rejects a direct 365-day request from a reciprocal %s viewer", async (entitlement) => {
    const viewer = state.rows.users[1];
    viewer.subscriptionTier = entitlement === "free" ? "free" : "premium";
    viewer.subscriptionExpiresAt = new Date("2026-10-13T00:00:00Z");
    await expect(getPartnerData(365)).rejects.toThrow();
    expect(state.reads.filter((read) => read.table === "scores" || read.table === "daily_logs")).toEqual([]);
  });

  it.each(["paid", "lifetime", "trial"])("allows at most thirty days for an active premium %s entitlement", async (entitlement) => {
    const viewer = state.rows.users[1];
    if (entitlement === "lifetime") viewer.subscriptionExpiresAt = null;
    if (entitlement === "trial") {
      viewer.subscriptionTier = "free"; viewer.subscriptionExpiresAt = null; viewer.trialEndsAt = new Date("2026-10-15T00:00:00Z");
    }
    const result = await getPartnerData(30);
    expect(result.scores.map((score) => score.date)).toEqual(["2026-10-14", "2026-10-07", "2026-10-06", "2026-09-14"]);
    expect(result.logs.map((log) => log.date)).toEqual(["2026-10-14", "2026-10-07", "2026-10-06", "2026-09-14"]);
  });

  it("honors a narrower seven-day request even for premium", async () => {
    const result = await getPartnerData(7);
    expect(result.scores.map((score) => score.date)).toEqual(["2026-10-14", "2026-10-07"]);
    expect(result.logs.map((log) => log.date)).toEqual(["2026-10-14", "2026-10-07"]);
  });
});
