import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTableColumns, getTableName, type SQL } from "drizzle-orm";
import { PgDialect, type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core";
import PartnerDashboardPage from "@/app/(dashboard)/partner/dashboard/page";
import { PartnerDashboardClient } from "@/app/(dashboard)/partner/dashboard/partner-dashboard-client";
import InsightsPage from "@/app/(dashboard)/insights/page";
import { InsightsClient } from "@/app/(dashboard)/insights/insights-client";

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
vi.mock("@/lib/subscription/access", () => ({ getUserTier: async () => "premium", getFeatureLimits: () => ({ historyDays: 30 }) }));
vi.mock("@/app/(dashboard)/insights/insights-client", () => ({ InsightsClient: () => null }));

type ReadBuilder = PromiseLike<Row[]> & {
  where: (predicate: SQL) => ReadBuilder;
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
    const execute = () => {
      const query = predicate ? dialect.sqlToQuery(predicate) : null;
      if (query && /\bor\b/i.test(query.sql)) throw new Error("Unexpected OR in reader fixture");
      const equalities = query ? [...query.sql.matchAll(/"[^"]+"\."([^"]+)" = \$(\d+)/g)] : [];
      const rows = (state.rows[getTableName(table)] ?? []).filter((row) => equalities.every(([, column, parameter]) => {
        const field = Object.keys(columns).find((key) => columns[key].name === column)!;
        return row[field] === query!.params[Number(parameter) - 1];
      }));
      if (descending) rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      const selected = rows.slice(0, limit);
      const fields = projection ?? columns;
      state.reads.push({ table: getTableName(table), fields: Object.keys(fields), count: selected.length, limit, params: query?.params ?? [] });
      return selected.map((row) => Object.fromEntries(Object.entries(fields).map(([name, column]) => {
        const field = Object.keys(columns).find((key) => columns[key] === column)!;
        return [name, row[field]];
      })));
    };
    const builder: ReadBuilder = {
      where: (value) => { predicate = value; return builder; },
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
  vi.stubGlobal("React", React);
  state.actor = { id: "A", name: "Alice", partnerId: "B" };
  state.reads = [];
  state.rows = {
    users: [{ id: "B", name: "Bob", partnerId: "A", email: "private@example.test", passwordHash: "private-password" }],
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
afterEach(() => { vi.unstubAllGlobals(); });

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
