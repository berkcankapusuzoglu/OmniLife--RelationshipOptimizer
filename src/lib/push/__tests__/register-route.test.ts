import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { DELETE, POST } from "@/app/api/push/register/route";

const state = vi.hoisted(() => ({
  logs: [] as Array<{ createdAt: Date | null }>,
  inserts: [] as Array<{ values: Record<string, unknown>; conflict: Record<string, unknown> | undefined }>,
  updates: [] as Array<{ values: Record<string, unknown>; sql: string; params: unknown[] }>,
  deletes: [] as Array<{ sql: string; params: unknown[] }>,
  selectLimit: 0,
}));

vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => ({ id: "user-test" }) }));
vi.mock("@/lib/db", () => ({ getDb: () => ({
  select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async (n: number) => { state.selectLimit = n; return state.logs.slice(0, n); } }) }) }) }),
  insert: () => ({ values: (values: Record<string, unknown>) => ({ onConflictDoUpdate: async (conflict: Record<string, unknown>) => { state.inserts.push({ values, conflict }); } }) }),
  update: () => ({ set: (values: Record<string, unknown>) => ({ where: async (predicate: SQL) => {
    const query = new PgDialect().sqlToQuery(predicate);
    state.updates.push({ values, sql: query.sql, params: query.params });
  } }) }),
  delete: () => ({ where: async (predicate: SQL) => {
    const query = new PgDialect().sqlToQuery(predicate);
    state.deletes.push({ sql: query.sql, params: query.params });
  } }),
}) }));

const post = (body: unknown) => POST(new NextRequest("https://example.test/api/push/register", { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) }));
const del = (body: unknown) => DELETE(new NextRequest("https://example.test/api/push/register", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const at = (iso: string) => ({ createdAt: new Date(iso) });

beforeEach(() => { state.logs = []; state.inserts = []; state.updates = []; state.deletes = []; state.selectLimit = 0; });
afterEach(() => { vi.restoreAllMocks(); });

describe("POST /api/push/register", () => {
  it("rejects invalid bodies", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ token: "", platform: "android" })).status).toBe(400);
    expect((await post({ token: "abc", platform: "windows" })).status).toBe(400);
    expect((await post("not json")).status).toBe(400);
    expect(state.inserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("upserts the token for the signed-in user and opts them in with the default hour", async () => {
    const res = await post({ token: "tok-1", platform: "android" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, reminderHourUtc: 20 });
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].values).toMatchObject({ token: "tok-1", userId: "user-test", platform: "android" });
    expect(state.inserts[0].conflict?.set).toMatchObject({ userId: "user-test", platform: "android" });
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].values).toEqual({ pushOptIn: true, reminderHourUtc: 20 });
    expect(state.updates[0].sql).toMatch(/"users"\."id" = \$1/);
    expect(state.updates[0].params).toEqual(["user-test"]);
  });

  it("uses the modal UTC hour of the last 14 logs", async () => {
    state.logs = [at("2026-10-18T07:10:00Z"), at("2026-10-17T21:00:00Z"), at("2026-10-16T21:30:00Z"), at("2026-10-15T07:59:00Z"), at("2026-10-14T21:05:00Z"), { createdAt: null }];
    const res = await post({ token: "tok-1", platform: "ios" });
    expect(await res.json()).toEqual({ ok: true, reminderHourUtc: 21 });
    expect(state.selectLimit).toBe(14);
    expect(state.updates[0].values.reminderHourUtc).toBe(21);
  });

  it("breaks ties toward the most recent log hour", async () => {
    state.logs = [at("2026-10-18T07:10:00Z"), at("2026-10-17T21:00:00Z")];
    expect(await (await post({ token: "tok-1", platform: "web" })).json()).toEqual({ ok: true, reminderHourUtc: 7 });
  });
});

describe("DELETE /api/push/register", () => {
  it("removes only the caller's token and opts them out", async () => {
    const res = await del({ token: "tok-1" });
    expect(res.status).toBe(200);
    expect(state.deletes).toHaveLength(1);
    expect(state.deletes[0].sql).toMatch(/"push_tokens"\."token" = \$\d and "push_tokens"\."user_id" = \$\d/);
    expect(state.deletes[0].params).toEqual(["tok-1", "user-test"]);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].values).toEqual({ pushOptIn: false });
    expect(state.updates[0].params).toEqual(["user-test"]);
  });
  it("rejects a missing token", async () => {
    expect((await del({})).status).toBe(400);
    expect(state.deletes).toHaveLength(0);
  });
});
