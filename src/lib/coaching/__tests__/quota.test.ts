import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { coachingModel, coachingQuotaForTier, consumeCoachingQuota, refundCoachingQuota, todayUtc } from "@/lib/coaching/quota";
import { sendCoachingMessage } from "@/app/(dashboard)/coaching/actions";

// A real Drizzle query builder over a proxy driver: every statement the code
// under test runs lands in `state.queries` as the exact SQL + params Postgres
// would receive, and `state.rows` is what the "database" answers with.
const state = vi.hoisted(() => ({
  queries: [] as Array<{ sql: string; params: unknown[] }>,
  rows: [] as Record<string, unknown>[],
  sessions: [] as Record<string, unknown>[],
  tier: "premium" as string,
  gemini: { sendMessage: vi.fn(), ctor: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  getDb: () =>
    drizzle(async (sql, params) => {
      state.queries.push({ sql, params });
      const source = sql.includes("coaching_usage") ? state.rows : state.sessions;
      return { rows: source.map((row) => Object.values(row)) };
    }),
}));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => ({ id: "user-test" }) }));
vi.mock("@/lib/subscription/access", () => ({ getUserTier: async () => state.tier }));
vi.mock("@/lib/coaching/prompt-builder", () => ({
  buildCoachingContext: async () => ({}),
  buildSystemPrompt: () => "system",
  buildCoachingMessage: () => "STATIC FALLBACK REPLY",
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    constructor(key: string) { state.gemini.ctor(key); }
    getGenerativeModel(config: unknown) {
      state.gemini.ctor(config);
      return { startChat: (opts: unknown) => ({ sendMessage: (msg: string) => state.gemini.sendMessage(msg, opts) }) };
    }
  },
}));

function usageQueries() {
  return state.queries.filter((q) => q.sql.includes("coaching_usage"));
}

beforeEach(() => {
  state.queries = [];
  state.rows = [];
  state.sessions = [];
  state.tier = "premium";
  state.gemini.sendMessage.mockReset();
  state.gemini.ctor.mockReset();
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.GEMINI_MODEL;
});
afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
});

describe("consumeCoachingQuota", () => {
  it("is a single atomic upsert guarded by the limit, returning the new count", async () => {
    state.rows = [{ count: 7 }];
    const result = await consumeCoachingQuota("user-test", 30, "2026-10-19");
    expect(result).toEqual({ allowed: true, used: 7, limit: 30 });
    expect(usageQueries()).toHaveLength(1);
    const [{ sql, params }] = usageQueries();
    expect(sql).toMatch(/^insert into "coaching_usage"/);
    expect(sql).toMatch(/on conflict \("user_id","day"\) do update set "count" = "coaching_usage"\."count" \+ 1 where "coaching_usage"\."count" < \$\d+/);
    expect(sql).toMatch(/returning "count"/);
    expect(params).toEqual(expect.arrayContaining(["user-test", "2026-10-19", 1, 30]));
  });

  it("denies when the guarded update touches no row (quota exhausted)", async () => {
    state.rows = [];
    const result = await consumeCoachingQuota("user-test", 30, "2026-10-19");
    expect(result).toEqual({ allowed: false, used: 30, limit: 30 });
  });

  it("denies a zero limit without touching the database", async () => {
    const result = await consumeCoachingQuota("user-test", 0, "2026-10-19");
    expect(result).toEqual({ allowed: false, used: 0, limit: 0 });
    expect(usageQueries()).toHaveLength(0);
  });

  it("defaults the day to today in UTC", async () => {
    state.rows = [{ count: 1 }];
    await consumeCoachingQuota("user-test", 30);
    expect(usageQueries()[0].params).toContain(todayUtc());
    expect(todayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("refundCoachingQuota", () => {
  it("decrements the day's counter without going below zero", async () => {
    await refundCoachingQuota("user-test", "2026-10-19");
    const [{ sql, params }] = usageQueries();
    expect(sql).toMatch(/^update "coaching_usage" set "count" = greatest\("coaching_usage"\."count" - 1, 0\)/);
    expect(sql).toMatch(/where \("coaching_usage"\."user_id" = \$\d+ and "coaching_usage"\."day" = \$\d+\)/);
    expect(params).toEqual(["user-test", "2026-10-19"]);
  });
});

describe("coachingModel / coachingQuotaForTier", () => {
  it("reads GEMINI_MODEL with a gemini-2.5-flash default", () => {
    expect(coachingModel()).toBe("gemini-2.5-flash");
    process.env.GEMINI_MODEL = "gemini-9-ultra";
    expect(coachingModel()).toBe("gemini-9-ultra");
  });

  it("maps tiers to their daily message quota", () => {
    expect(coachingQuotaForTier("free")).toBe(0);
    expect(coachingQuotaForTier("pro")).toBe(0);
    expect(coachingQuotaForTier("premium")).toBe(30);
  });
});

describe("sendCoachingMessage", () => {
  it("gates tiers without a quota before touching the counter", async () => {
    state.tier = "free";
    const result = await sendCoachingMessage(null, "hello");
    expect(result.error).toMatch(/premium/i);
    expect(usageQueries()).toHaveLength(0);
    expect(state.gemini.sendMessage).not.toHaveBeenCalled();
  });

  it("refuses with the honest limit message once the day's 30 are used", async () => {
    state.rows = [];
    const result = await sendCoachingMessage(null, "hello");
    expect(result).toEqual({ error: "You've used today's 30 coaching messages. Resets at midnight UTC." });
    expect(state.gemini.sendMessage).not.toHaveBeenCalled();
  });

  it("replies via Gemini with the configured model, 400 tokens and 6-turn history, counting one message", async () => {
    state.rows = [{ count: 3 }];
    state.gemini.sendMessage.mockResolvedValue({ response: { text: () => "coach says hi" } });
    const result = await sendCoachingMessage(null, "hello");
    expect(result.error).toBeUndefined();
    expect(result.reply?.content).toBe("coach says hi");
    expect(result.sessionId).toBeTruthy();
    expect(state.gemini.ctor).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-2.5-flash", generationConfig: { maxOutputTokens: 400 } }));
    expect(usageQueries()).toHaveLength(1);
    expect(usageQueries()[0].sql).toMatch(/^insert/);
    expect(state.queries.some((q) => q.sql.startsWith('insert into "coaching_sessions"'))).toBe(true);
  });

  it("sends only the last 6 turns of an existing session as history", async () => {
    const messages = Array.from({ length: 9 }, (_, i) => ({ role: i % 2 ? "coach" : "user", content: `m${i}`, timestamp: "t" }));
    const session = { id: "11111111-1111-4111-8111-111111111111", userId: "user-test", messages, createdAt: new Date() };
    state.sessions = [session];
    state.rows = [{ count: 2 }];
    state.gemini.sendMessage.mockResolvedValue({ response: { text: () => "ok" } });
    const result = await sendCoachingMessage(session.id, "hello");
    expect(result.error).toBeUndefined();
    const [, opts] = state.gemini.sendMessage.mock.calls[0] as [string, { history: Array<{ parts: Array<{ text: string }> }> }];
    expect(opts.history.map((h) => h.parts[0].text)).toEqual(["m3", "m4", "m5", "m6", "m7", "m8"]);
  });

  it("caps the user message at 2000 characters", async () => {
    state.rows = [{ count: 1 }];
    await expect(sendCoachingMessage(null, "x".repeat(2001))).rejects.toThrow();
    expect(usageQueries()).toHaveLength(0);
  });

  it("refunds the counter and never answers statically when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    state.rows = [{ count: 1 }];
    const result = await sendCoachingMessage(null, "hello");
    expect(result).toEqual({ error: "The coach is unavailable right now. Nothing was charged against your daily limit." });
    expect(usageQueries().map((q) => q.sql.split(" ")[0])).toEqual(["insert", "update"]);
    expect(state.queries.some((q) => q.sql.includes("coaching_sessions"))).toBe(false);
  });

  it("refunds the counter and never answers statically when the provider fails", async () => {
    state.rows = [{ count: 1 }];
    state.gemini.sendMessage.mockRejectedValue(new Error("429 quota"));
    const result = await sendCoachingMessage(null, "hello");
    expect(result).toEqual({ error: "The coach is unavailable right now. Nothing was charged against your daily limit." });
    expect(usageQueries().map((q) => q.sql.split(" ")[0])).toEqual(["insert", "update"]);
    expect(JSON.stringify(result)).not.toContain("STATIC FALLBACK REPLY");
  });
});
