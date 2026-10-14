import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableColumns, getTableName, type SQL } from "drizzle-orm";
import { PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { hashPassword } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/guard";
import { deleteAccount } from "../delete-account";
import { deleteAccountAction } from "@/app/(dashboard)/settings/actions";

type Row = Record<string, unknown>;
type Query = PromiseLike<Row[]> & { where(predicate: SQL): Query; limit(maximum: number): Query; for(): Query };
interface MemoryDb {
  select(): { from(table: PgTable): Query };
  update(table: PgTable): { set(values: Row): Query };
  delete(table: PgTable): Query;
  transaction<T>(fn: (tx: MemoryDb) => Promise<T>): Promise<T>;
}
const state = vi.hoisted(() => ({ rows: {} as Record<string, Row[]>, db: null as MemoryDb | null, actor: "A" as string | null, failureTable: "", billingFailure: false, subscriptions: [] as Array<{ id: string; status: string }>, customerDeleted: false }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDb: () => state.db }));
vi.mock("@/lib/auth/session", () => ({ getSession: async () => state.actor ? { userId: state.actor } : null, deleteSession: async () => { state.actor = null; } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`Redirect:${url}`); } }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({
  subscriptions: {
    list: () => ({ async *[Symbol.asyncIterator]() { for (const item of state.subscriptions) yield { ...item }; } }),
    retrieve: async (id: string) => { const item = state.subscriptions.find((s) => s.id === id); if (!item) throw { code: "resource_missing", statusCode: 404 }; return { ...item }; },
    cancel: async (id: string) => { if (state.billingFailure) throw new Error("provider unavailable"); const item = state.subscriptions.find((s) => s.id === id); if (item) item.status = "canceled"; },
  },
  customers: { del: async () => { if (state.billingFailure) throw new Error("provider unavailable"); state.customerDeleted = true; } },
}) }));

// External PostgreSQL is replaced, while real Drizzle predicates select separate
// owner/survivor fixtures. No cascades: every table needs an explicit deletion.
function memoryDb() {
  const dialect = new PgDialect();
  function query(table: PgTable, kind: string, values?: Row) {
    let predicate: SQL | undefined;
    let maximum = Infinity;
    const columns = getTableColumns(table);
    const chain: Query = {
      where: (p: SQL) => { predicate = p; return chain; }, limit: (n: number) => { maximum = n; return chain; }, for: () => chain,
      then: (resolve, reject) => Promise.resolve().then(() => {
        const name = getTableName(table);
        if (kind !== "select" && state.failureTable === name) throw new Error("database failure");
        const matches = (row: Row) => {
          if (!predicate) return true;
          const compiled = dialect.sqlToQuery(predicate);
          const expression = compiled.sql
            .replace(/"[^\"]+"\."([^\"]+)"/g, (_, column) => JSON.stringify(row[Object.keys(columns).find((key) => columns[key].name === column)!] ?? null))
            .replace(/\$(\d+)/g, (_, index) => JSON.stringify(compiled.params[Number(index) - 1]))
            .replace(/lower\(("[^\"]*"|null)\)/gi, (_, value) => `String(${value}).toLowerCase()`)
            .replace(/("[^\"]*"|null) like "([^\"]*)"/gi, (_, value, pattern) => `String(${value}).match(${JSON.stringify("^" + pattern.replace(/%/g, ".*") + "$")}) !== null`)
            .replace(/(?<![<>!=])=(?!=)/g, "===").replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");
          return Function(`return (${expression})`)();
        };
        const rows = state.rows[name] ??= [];
        const selected = rows.filter(matches).slice(0, maximum);
        if (kind === "delete") state.rows[name] = rows.filter((row) => !selected.includes(row));
        if (kind === "update") selected.forEach((row) => Object.assign(row, values));
        return structuredClone(selected);
      }).then(resolve, reject),
    };
    return chain;
  }
  const db: MemoryDb = {
    select: () => ({ from: (table) => query(table, "select") }),
    update: (table) => ({ set: (values) => query(table, "update", values) }),
    delete: (table) => query(table, "delete"),
    transaction: async (fn) => { const snapshot = structuredClone(state.rows); try { return await fn(db); } catch (error) { state.rows = snapshot; throw error; } },
  };
  return db;
}
function form(password = "correct-password", confirmation = "DELETE") { const data = new FormData(); data.set("password", password); data.set("confirmation", confirmation); data.set("userId", "B"); return data; }

describe("account deletion", () => {
  beforeEach(async () => {
    state.actor = "A"; state.failureTable = ""; state.billingFailure = false; state.subscriptions = []; state.customerDeleted = false;
    state.rows = {
      users: [{ id: "A", email: "a@example.test", passwordHash: await hashPassword("correct-password"), partnerId: "B" }, { id: "B", email: "b@example.test", partnerId: "A" }],
      tasks: [{ id: "created-A", createdById: "A", assigneeId: "B", coupleId: "A::B" }, { id: "created-B", createdById: "B", assigneeId: "A", coupleId: "A::B" }, { id: "unrelated", createdById: "B", assigneeId: "B", coupleId: "B::C" }],
      referrals: [{ id: "outbound", referrerId: "A", referredEmail: "c@example.test" }, { id: "inbound", referrerId: "B", referredUserId: "A" }, { id: "by-email", referrerId: "B", referredEmail: "A@EXAMPLE.TEST" }, { id: "keep", referrerId: "B", referredEmail: "c@example.test" }],
      subscribers: [{ email: "A@EXAMPLE.TEST" }, { email: "b@example.test" }],
      partner_sync_events: [{ coupleId: "A::B" }, { coupleId: "A::C" }, { coupleId: "0::A" }, { coupleId: "B::C" }],
    };
    for (const table of ["daily_logs", "weekly_checkins", "scores", "constraints", "scenario_profiles", "interventions", "password_resets", "coaching_sessions"]) state.rows[table] = [{ id: `${table}-A`, userId: "A" }, { id: `${table}-B`, userId: "B" }];
    state.db = memoryDb();
  });
  it("deletes every owned table and account-associated marketing record", async () => {
    await deleteAccount("A");
    for (const table of ["daily_logs", "weekly_checkins", "scores", "constraints", "scenario_profiles", "interventions", "password_resets", "coaching_sessions"]) expect(state.rows[table]).toEqual([{ id: `${table}-B`, userId: "B" }]);
    expect(state.rows.users).toEqual([{ id: "B", email: "b@example.test", partnerId: null }]);
    expect(state.rows.referrals).toEqual([{ id: "keep", referrerId: "B", referredEmail: "c@example.test" }]);
    expect(state.rows.subscribers).toEqual([{ email: "b@example.test" }]);
    expect(state.rows.partner_sync_events).toEqual([{ coupleId: "B::C" }]);
  });
  it("preserves survivor-created tasks, removes assignments and dissolves old couple IDs", async () => {
    state.rows.users[0].partnerId = null;
    await deleteAccount("A");
    expect(state.rows.tasks).toEqual([{ id: "created-B", createdById: "B", assigneeId: null, coupleId: null }, { id: "unrelated", createdById: "B", assigneeId: "B", coupleId: "B::C" }]);
  });
  it("rolls all data back if any deletion fails", async () => {
    const before = structuredClone(state.rows); state.failureTable = "daily_logs";
    await expect(deleteAccount("A")).rejects.toThrow();
    expect(state.rows).toEqual(before);
  });
  it("requires exact confirmation and the current password", async () => {
    expect(await deleteAccountAction({}, form("wrong-password"))).toHaveProperty("error");
    expect(await deleteAccountAction({}, form("correct-password", "delete"))).toHaveProperty("error");
    expect(state.rows.users).toHaveLength(2); expect(state.actor).toBe("A");
  });
  it("deletes only the authenticated account and invalidates current and replayed sessions", async () => {
    await expect(deleteAccountAction({}, form())).rejects.toThrow("Redirect:/delete-account?deleted=1");
    expect(state.actor).toBeNull();
    state.actor = "A";
    expect(await getCurrentUser()).toBeNull();
    expect(state.rows.users.map((user) => user.id)).toEqual(["B"]);
  });
  it("rejects unauthenticated deletion", async () => {
    state.actor = null;
    await expect(deleteAccountAction({}, form())).rejects.toThrow("Redirect:/login");
    expect(state.rows.users).toHaveLength(2);
  });
  it("cancels all billable Stripe subscriptions and deletes the Stripe customer", async () => {
    Object.assign(state.rows.users[0], { stripeCustomerId: "cus-A", stripeSubscriptionId: "sub-A" });
    state.subscriptions = [{ id: "sub-A", status: "active" }, { id: "sub-extra", status: "past_due" }, { id: "sub-old", status: "canceled" }, { id: "sub-expired", status: "incomplete_expired" }];
    await deleteAccount("A");
    expect(state.subscriptions.map((s) => s.status)).toEqual(["canceled", "canceled", "canceled", "incomplete_expired"]);
    expect(state.customerDeleted).toBe(true); expect(await getCurrentUser()).toBeNull();
  });
  it("cancels a stored subscription even if the customer ID is absent", async () => {
    state.rows.users[0].stripeSubscriptionId = "sub-A"; state.subscriptions = [{ id: "sub-A", status: "trialing" }];
    await deleteAccount("A"); expect(state.subscriptions[0].status).toBe("canceled");
  });
  it("treats an already removed Stripe subscription as retry-safe", async () => {
    state.rows.users[0].stripeSubscriptionId = "sub-gone";
    await deleteAccount("A"); expect(await getCurrentUser()).toBeNull();
  });
  it("keeps data and session intact and gives an actionable billing error when Stripe fails", async () => {
    state.rows.users[0].stripeCustomerId = "cus-A"; state.billingFailure = true;
    const before = structuredClone(state.rows);
    const result = await deleteAccountAction({}, form());
    expect(result.error).toMatch(/billing/i); expect(result.error).toMatch(/retry|try again/i);
    expect(state.rows).toEqual(before); expect(state.actor).toBe("A");
  });
  it("reports database failure without claiming completion after billing was canceled", async () => {
    state.rows.users[0].stripeSubscriptionId = "sub-A"; state.subscriptions = [{ id: "sub-A", status: "active" }]; state.failureTable = "daily_logs";
    const result = await deleteAccountAction({}, form());
    expect(result.error).toMatch(/billing|subscription/i); expect(state.rows.users).toHaveLength(2);
    expect(state.subscriptions[0].status).toBe("canceled");
  });
});
