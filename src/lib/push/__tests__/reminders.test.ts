import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { users, pushTokens } from "@/lib/db/schema";
import { pickDailyReminderUsers, pickTrialDay5Users, runReminders } from "@/lib/push/reminders";
import { GET as remindersRoute } from "@/app/api/push/reminders/route";

const state = vi.hoisted(() => ({
  users: [] as Array<Record<string, unknown>>,
  tokens: [] as Array<{ token: string; userId: string; platform: string }>,
  updates: [] as Array<{ values: Record<string, unknown>; sql: string; params: unknown[] }>,
  deletes: [] as Array<{ sql: string; params: unknown[] }>,
  selects: [] as Array<{ table: unknown; sql: string; params: unknown[] }>,
  sent: [] as Array<{ token: string; title: string; body: string }>,
  results: {} as Record<string, "sent" | "unregistered" | "failed">,
}));

vi.mock("@/lib/db", () => ({ getDb: () => ({
  select: () => ({ from: (table: unknown) => ({ where: async (predicate: SQL) => {
    const query = new PgDialect().sqlToQuery(predicate);
    state.selects.push({ table, sql: query.sql, params: query.params });
    if (table === users) return state.users;
    if (table === pushTokens) return state.tokens.filter(t => query.params.includes(t.userId));
    throw new Error("unexpected table");
  } }) }),
  update: () => ({ set: (values: Record<string, unknown>) => ({ where: async (predicate: SQL) => {
    const query = new PgDialect().sqlToQuery(predicate);
    state.updates.push({ values, sql: query.sql, params: query.params });
  } }) }),
  delete: () => ({ where: async (predicate: SQL) => {
    const query = new PgDialect().sqlToQuery(predicate);
    state.deletes.push({ sql: query.sql, params: query.params });
    state.tokens = state.tokens.filter(t => !query.params.includes(t.token));
  } }),
}) }));
vi.mock("@/lib/push/fcm", () => ({ sendPush: async (token: string, msg: { title: string; body: string }) => {
  state.sent.push({ token, title: msg.title, body: msg.body });
  return state.results[token] ?? "sent";
} }));

const now = new Date("2026-10-19T20:15:00Z"); // 20:00 UTC hour
function user(id: string, extra: Record<string, unknown> = {}) {
  return { id, pushOptIn: true, reminderHourUtc: 20, lastLogDate: "2026-10-18", billingTrialEndsAt: null, trialReminderSentAt: null, ...extra };
}

beforeEach(() => {
  state.users = []; state.tokens = []; state.updates = []; state.deletes = []; state.selects = []; state.sent = []; state.results = {};
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("pickDailyReminderUsers", () => {
  it("selects opted-in users at their hour who have not logged today", () => {
    const rows = [
      user("due"),
      user("never-logged", { lastLogDate: null }),
      user("logged-today", { lastLogDate: "2026-10-19" }),
      user("wrong-hour", { reminderHourUtc: 9 }),
      user("opted-out", { pushOptIn: false }),
      user("no-hour", { reminderHourUtc: null }),
    ];
    expect(pickDailyReminderUsers(rows, now)).toEqual(["due", "never-logged"]);
  });
  it("accepts Date values for lastLogDate", () => {
    expect(pickDailyReminderUsers([user("d", { lastLogDate: new Date("2026-10-18T00:00:00Z") })], now)).toEqual(["d"]);
    expect(pickDailyReminderUsers([user("t", { lastLogDate: new Date("2026-10-19T00:00:00Z") })], now)).toEqual([]);
  });
});

describe("pickTrialDay5Users", () => {
  it("selects trials ending 36h-60h from now that have not been reminded", () => {
    const h = 3_600_000;
    const rows = [
      user("in-window", { billingTrialEndsAt: new Date(now.getTime() + 48 * h) }),
      user("lower-edge", { billingTrialEndsAt: new Date(now.getTime() + 36 * h) }),
      user("upper-edge", { billingTrialEndsAt: new Date(now.getTime() + 60 * h) }),
      user("too-soon", { billingTrialEndsAt: new Date(now.getTime() + 35 * h) }),
      user("too-late", { billingTrialEndsAt: new Date(now.getTime() + 61 * h) }),
      user("already-sent", { billingTrialEndsAt: new Date(now.getTime() + 48 * h), trialReminderSentAt: new Date() }),
      user("no-trial"),
    ];
    expect(pickTrialDay5Users(rows, now)).toEqual(["in-window", "lower-edge", "upper-edge"]);
  });
});

describe("runReminders", () => {
  it("sends one daily reminder per due user to every device and one trial reminder per trial", async () => {
    const h = 3_600_000;
    state.users = [
      user("daily", {}),
      user("trial", { reminderHourUtc: 9, billingTrialEndsAt: new Date(now.getTime() + 48 * h) }),
      user("both", { billingTrialEndsAt: new Date(now.getTime() + 40 * h) }),
      user("idle", { reminderHourUtc: 9 }),
    ];
    state.tokens = [
      { token: "daily-1", userId: "daily", platform: "android" },
      { token: "daily-2", userId: "daily", platform: "ios" },
      { token: "trial-1", userId: "trial", platform: "android" },
      { token: "both-1", userId: "both", platform: "android" },
      { token: "idle-1", userId: "idle", platform: "android" },
    ];
    const result = await runReminders(now);
    expect(result).toEqual({ daily: 2, trial: 2 });
    expect(state.sent.map(s => s.token).sort()).toEqual(["both-1", "both-1", "daily-1", "daily-2", "trial-1"]);
    const titles = new Set(state.sent.map(s => s.title));
    expect(titles.size).toBe(2);
    // Trial reminders are marked sent, guarded by trial_reminder_sent_at IS NULL.
    const marks = state.updates.filter(u => "trialReminderSentAt" in u.values);
    expect(marks.map(m => m.params[0]).sort()).toEqual(["both", "trial"]);
    for (const mark of marks) { expect(mark.sql).toMatch(/"trial_reminder_sent_at" is null/); expect(mark.values.trialReminderSentAt).toBeInstanceOf(Date); }
  });

  it("only loads opted-in users", async () => {
    await runReminders(now);
    const usersSelect = state.selects.find(s => s.table === users)!;
    expect(usersSelect.sql).toMatch(/"users"\."push_opt_in" = \$\d/);
    expect(usersSelect.params).toContain(true);
  });

  it("deletes unregistered tokens and does not count failed sends", async () => {
    state.users = [user("a"), user("b")];
    state.tokens = [{ token: "a-stale", userId: "a", platform: "android" }, { token: "b-bad", userId: "b", platform: "android" }];
    state.results = { "a-stale": "unregistered", "b-bad": "failed" };
    expect(await runReminders(now)).toEqual({ daily: 0, trial: 0 });
    expect(state.deletes).toHaveLength(1);
    expect(state.deletes[0].sql).toMatch(/"push_tokens"\."token" = \$1/);
    expect(state.deletes[0].params).toEqual(["a-stale"]);
  });

  it("does not mark a trial reminder sent when no device received it", async () => {
    state.users = [user("t", { reminderHourUtc: 9, billingTrialEndsAt: new Date(now.getTime() + 48 * 3_600_000) })];
    state.tokens = [{ token: "t-1", userId: "t", platform: "android" }];
    state.results = { "t-1": "failed" };
    expect(await runReminders(now)).toEqual({ daily: 0, trial: 0 });
    expect(state.updates).toHaveLength(0);
  });

  it("skips token lookup when nobody is due", async () => {
    state.users = [user("idle", { reminderHourUtc: 9 })];
    expect(await runReminders(now)).toEqual({ daily: 0, trial: 0 });
    expect(state.selects.filter(s => s.table === pushTokens)).toHaveLength(0);
  });
});

describe("GET /api/push/reminders", () => {
  const get = (auth?: string) => remindersRoute(new NextRequest("https://example.test/api/push/reminders", { headers: auth ? { authorization: auth } : {} }));
  it("returns 503 when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await get("Bearer x")).status).toBe(503);
  });
  it("returns 401 without the bearer secret", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test");
    expect((await get()).status).toBe(401);
    expect((await get("Bearer wrong")).status).toBe(401);
    expect(state.selects).toHaveLength(0);
  });
  it("runs the job and reports counts", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test");
    state.users = [user("u", { reminderHourUtc: new Date().getUTCHours() })];
    state.tokens = [{ token: "u-1", userId: "u", platform: "android" }];
    const res = await get("Bearer cron-test");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, daily: 1, trial: 0 });
  });
});
