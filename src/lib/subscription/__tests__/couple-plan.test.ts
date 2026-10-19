import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { getTableName, type SQL } from "drizzle-orm";
import { getEntitlement, getUserTier } from "@/lib/subscription/access";

type Row = Record<string, unknown>;
const state = vi.hoisted(() => ({ users: [] as Record<string, unknown>[], writes: 0, selects: 0 }));

// Compile the real Drizzle join/where predicates and evaluate them against
// in-memory rows, so a non-reciprocal link or a missing WHERE is visible.
function evaluate(predicate: SQL, scope: Record<string, Row | null>): boolean {
  const compiled = new PgDialect().sqlToQuery(predicate);
  const expression = compiled.sql
    .replace(/"([^"]+)"\."([^"]+)"/g, (_, table, column) => JSON.stringify(scope[table]?.[column] ?? null))
    .replace(/\$(\d+)/g, (_, index) => JSON.stringify(compiled.params[Number(index) - 1]))
    .replace(/\bis null\b/gi, "=== null")
    .replace(/(?<![<>!=])=(?!=)/g, "===")
    .replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");
  return Function(`return (${expression})`)();
}

function project(projection: Record<string, unknown>, scope: Record<string, Row | null>) {
  const out: Row = {};
  for (const [key, column] of Object.entries(projection)) {
    const { table, name } = column as { table: Parameters<typeof getTableName>[0]; name: string };
    out[key] = scope[getTableName(table)]?.[name] ?? null;
  }
  return out;
}

vi.mock("@/lib/db", () => ({ getDb: () => ({
  update: () => { state.writes++; throw new Error("entitlement resolution must never write"); },
  insert: () => { state.writes++; throw new Error("entitlement resolution must never write"); },
  select: (projection: Record<string, unknown>) => {
    state.selects++;
    let joinOn: SQL | undefined; let where: SQL | undefined;
    const chain = {
      from: () => chain,
      leftJoin: (_alias: unknown, on: SQL) => { joinOn = on; return chain; },
      where: (predicate: SQL) => { where = predicate; return chain; },
      limit: async (count: number) => {
        const rows: Row[] = [];
        for (const user of state.users) {
          if (where && !evaluate(where, { users: user })) continue;
          const partner = state.users.find((candidate) => joinOn && evaluate(joinOn, { users: user, partner: candidate })) ?? null;
          rows.push(project(projection, { users: user, partner }));
        }
        return rows.slice(0, count);
      },
    };
    return chain;
  },
}) }));

const future = new Date("2099-01-01T00:00:00Z");
const past = new Date("2020-01-01T00:00:00Z");
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

function user(id: string, overrides: Row = {}): Row {
  return { id, partner_id: null, subscription_tier: "free", subscription_source: null, subscription_expires_at: null, trial_ends_at: null, ...overrides };
}
function premium(id: string, overrides: Row = {}) {
  return user(id, { subscription_tier: "premium", subscription_source: "revenuecat", subscription_expires_at: future, ...overrides });
}

beforeEach(() => { state.users = []; state.writes = 0; state.selects = 0; });
afterEach(() => { vi.restoreAllMocks(); });

describe("couple-plan entitlement", () => {
  it("returns own paid access first", async () => {
    state.users = [premium(A, { partner_id: B }), premium(B, { partner_id: A, subscription_source: "stripe" })];
    expect(await getEntitlement(A)).toEqual({ tier: "premium", via: "own", expiresAt: future, source: "revenuecat", ownerId: A });
  });
  it("inherits a reciprocally linked partner's Premium", async () => {
    state.users = [user(A, { partner_id: B }), premium(B, { partner_id: A })];
    expect(await getEntitlement(A)).toEqual({ tier: "premium", via: "partner", expiresAt: future, source: "revenuecat", ownerId: B });
    expect(await getUserTier(A)).toBe("premium");
  });
  it("does not inherit through a non-reciprocal link", async () => {
    state.users = [user(A, { partner_id: B }), premium(B, { partner_id: null })];
    expect(await getEntitlement(A)).toEqual({ tier: "free", via: "none", expiresAt: null, source: null, ownerId: A });
    state.users = [user(A, { partner_id: null }), premium(B, { partner_id: A })];
    expect((await getEntitlement(A)).tier).toBe("free");
  });
  it("does not inherit an expired partner subscription", async () => {
    state.users = [user(A, { partner_id: B }), premium(B, { partner_id: A, subscription_expires_at: past })];
    expect((await getEntitlement(A)).tier).toBe("free");
  });
  it("does not inherit a partner's trial", async () => {
    state.users = [user(A, { partner_id: B }), user(B, { partner_id: A, trial_ends_at: future })];
    expect((await getEntitlement(A)).tier).toBe("free");
  });
  it("prefers the user's own trial over the partner's plan", async () => {
    state.users = [user(A, { partner_id: B, trial_ends_at: future }), user(B, { partner_id: A, subscription_tier: "pro", subscription_source: "stripe", subscription_expires_at: future })];
    expect(await getEntitlement(A)).toEqual({ tier: "premium", via: "trial", expiresAt: future, source: null, ownerId: A });
  });
  it("treats an own expired subscription as free unless the partner covers it", async () => {
    state.users = [premium(A, { partner_id: B, subscription_expires_at: past }), premium(B, { partner_id: A })];
    expect(await getEntitlement(A)).toMatchObject({ tier: "premium", via: "partner", ownerId: B });
    state.users = [premium(A, { subscription_expires_at: past })];
    expect(await getEntitlement(A)).toMatchObject({ tier: "free", via: "none" });
  });
  it("revokes inherited access after unlink", async () => {
    state.users = [user(A, { partner_id: B }), premium(B, { partner_id: A })];
    expect((await getEntitlement(A)).tier).toBe("premium");
    state.users = [user(A, { partner_id: null }), premium(B, { partner_id: null })];
    expect(await getEntitlement(A)).toMatchObject({ tier: "free", via: "none" });
  });
  it("returns legacy pro as pro whether own or inherited", async () => {
    state.users = [user(A, { partner_id: B }), premium(B, { partner_id: A, subscription_tier: "pro", subscription_source: "stripe" })];
    expect(await getEntitlement(A)).toMatchObject({ tier: "pro", via: "partner", source: "stripe", ownerId: B });
    state.users = [user(A, { subscription_tier: "pro", subscription_source: "stripe", subscription_expires_at: null })];
    expect(await getEntitlement(A)).toMatchObject({ tier: "pro", via: "own", expiresAt: null });
  });
  it("never writes and uses a single query", async () => {
    state.users = [user(A, { partner_id: B }), premium(B, { partner_id: A })];
    await getEntitlement(A);
    expect(state.writes).toBe(0);
    expect(state.selects).toBe(1);
  });
  it("returns free for an unknown user", async () => {
    expect(await getEntitlement("missing")).toEqual({ tier: "free", via: "none", expiresAt: null, source: null, ownerId: "missing" });
  });
});
