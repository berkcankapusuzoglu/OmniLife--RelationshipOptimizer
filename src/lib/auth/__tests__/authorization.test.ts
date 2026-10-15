import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { getTableColumns, getTableName, type SQL } from "drizzle-orm";
import { PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { submitDailyLog } from "@/app/(dashboard)/daily/actions";
import { submitWeeklyCheckin } from "@/app/(dashboard)/weekly/actions";
import { createTask, updateTaskStatus } from "@/app/(dashboard)/tasks/actions";
import { completeExercise } from "@/app/(dashboard)/exercises/actions";
import { addConstraint, toggleConstraint, removeConstraint } from "@/app/(dashboard)/constraints/actions";
import { activateScenario } from "@/app/(dashboard)/scenarios/actions";
import { generateInviteCode, linkPartner, unlinkPartner } from "@/app/(dashboard)/partner/actions";
import { getPartnerData } from "@/app/(dashboard)/compare/actions";
import { exportData, updateProfile, updateWeights } from "@/app/(dashboard)/settings/actions";
import { completeOnboarding } from "@/app/(dashboard)/onboarding/actions";
import { syncRevenueCatEntitlement } from "@/lib/revenuecat/sync";
import { sendCoachingMessage } from "@/app/(dashboard)/coaching/actions";
import { generateReport } from "@/app/(dashboard)/settings/export-pdf/actions";
import { registerAction } from "@/lib/auth/actions";
import { randomUUID } from "node:crypto";
import InvitePage from "@/app/(public)/invite/[code]/page";
import React from "react";
vi.mock("server-only", () => ({}));

type MemoryRow = Record<string, unknown>;
type MemoryQuery = PromiseLike<MemoryRow[]> & {
  where(predicate: SQL): MemoryQuery;
  orderBy(): MemoryQuery;
  limit(count: number): MemoryQuery;
  returning(): MemoryQuery;
};

const state = vi.hoisted(() => ({ actor: "", rows: {} as Record<string, MemoryRow[]>, db: null as unknown, sessions: [] as string[], pauseInviteSelect: null as null | (() => Promise<void>) }));
vi.mock("@/lib/db", () => ({ getDb: () => state.db }));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => {
  if (!state.actor) throw new Error("Unauthorized");
  return state.rows.users.find((u) => u.id === state.actor);
}, getCurrentUser: async () => state.actor ? state.rows.users.find((u) => u.id === state.actor) : null }));
vi.mock("@/app/(public)/invite/[code]/invite-client", () => ({ InviteClient: () => null }));
vi.mock("@/lib/auth/session", () => ({ getSession: async () => state.actor ? { userId: state.actor } : null, createSession: async (id: string) => { state.sessions.push(id); }, deleteSession: async () => {} }));
vi.mock("@/lib/referrals", () => ({ processReferral: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`Redirect:${url}`); } }));
vi.mock("@/lib/streaks", () => ({ updateStreak: async () => ({ currentStreak: 1, longestStreak: 1 }) }));
vi.mock("@/lib/analytics/track", () => ({ trackEvent: () => {} }));
vi.mock("@/lib/auth/tier-gate", () => ({ hasFeatureAccess: async () => ({ allowed: true }) }));
vi.mock("@/lib/coaching/prompt-builder", () => ({ buildCoachingContext: async () => ({}), buildCoachingMessage: () => "Try a check-in", buildSystemPrompt: () => "test" }));
vi.mock("@/lib/export/therapist-report", () => ({ generateTherapistReport: async (userId: string, name: string, daysBack: number) => ({ userId, name, daysBack }) }));

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const C = "00000000-0000-4000-8000-000000000003";
const resource = "00000000-0000-4000-8000-000000000010";
const missing = "00000000-0000-4000-8000-000000000099";
const weights = { alpha: .5, beta: .5, pillar: { vitality: .25, growth: .25, security: .25, connection: .25 }, rel: { emotional: .2, trust: .2, fairness: .2, stress: .2, autonomy: .2 } };
const assessment = { vitality: 5, growth: 5, security: 5, connection: 5, emotional: 5, trust: 5, fairness: 5, stress: 5, autonomy: 5 };
const daily = { ...assessment, mood: 5, energyLevel: 5, notes: "private" };
const weekly = { highlight: "a", challenge: "b", gratitude: "c", partnerAppreciation: "d", overallSatisfaction: 5, weeklyGoals: ["rest"] };
const onboarding = { ...assessment, relationshipStatus: "Married", goals: ["Build trust"], scenarioMode: "default", constraints: [] };

// The only replaced boundary is external PostgreSQL. Real Drizzle predicates are
// compiled and applied to separate A/B rows, so removing an ownership predicate
// causes a visible leak or mutation, rather than merely changing a spy argument.
function memoryDb() {
  const dialect = new PgDialect();
  function query(table: PgTable, kind: string, projection?: Record<string, unknown>, values: MemoryRow | MemoryRow[] = {}, undo?: Array<() => void>) {
    let predicate: SQL | undefined;
    let limit = Infinity;
    const columns = getTableColumns(table);
    function matches(row: MemoryRow) {
      if (!predicate) return true;
      const compiled = dialect.sqlToQuery(predicate);
      const expression = compiled.sql
        .replace(/"[^"]+"\."([^"]+)"/g, (_, column) => JSON.stringify(row[Object.keys(columns).find((key) => columns[key].name === column)!] ?? null))
        .replace(/\$(\d+)/g, (_, index) => JSON.stringify(compiled.params[Number(index) - 1]))
        .replace(/\bis null\b/gi, "=== null")
        .replace(/(?<![<>!=])=(?!=)/g, "===")
        .replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");
      return Function(`return (${expression})`)();
    }
    const run = () => {
      const name = getTableName(table);
      const rows = state.rows[name] ??= [];
      if (kind === "insert") { const inserted = (Array.isArray(values) ? values : [values]).map((v) => name === "users" ? ({ id: randomUUID(), partnerId: null, partnerInviteCode: null, ...v }) : ({ ...v })); rows.push(...inserted); undo?.push(() => { state.rows[name] = state.rows[name].filter((r) => !inserted.includes(r)); }); return inserted; }
      const selected = rows.filter(matches).slice(0, limit);
      if (kind === "update") selected.forEach((row) => {
        const before = { ...row };
        undo?.push(() => { for (const key of Object.keys(values)) { if (key in before) row[key] = before[key]; else delete row[key]; } });
        Object.assign(row, values);
      });
      if (kind === "delete") { state.rows[name] = rows.filter((row) => !selected.includes(row)); undo?.push(() => { state.rows[name].push(...selected); }); }
      if (projection) {
        if (projection.count) return [{ count: selected.length }];
        return selected.map((row) => Object.fromEntries(Object.entries(projection).map(([key, column]) => [key, row[Object.keys(columns).find((field) => columns[field] === column)!]])));
      }
      return selected.map((row) => ({ ...row }));
    };
    const execute = async () => {
      const result = run();
      // Pause a candidate read after its snapshot to model another entry point
      // committing before the delayed conditional claim executes.
      if (kind === "select" && getTableName(table) === "users" && predicate && dialect.sqlToQuery(predicate).params.includes("BOBCOD") && state.pauseInviteSelect) {
        const pause = state.pauseInviteSelect;
        state.pauseInviteSelect = null;
        await pause();
      }
      return result;
    };
    const chain: MemoryQuery = { where: (p: SQL) => { predicate = p; return chain; }, orderBy: () => chain, limit: (n: number) => { limit = n; return chain; }, returning: () => chain, then: (ok, fail) => Promise.resolve().then(execute).then(ok, fail) };
    return chain;
  }
  const makeDb = (undo?: Array<() => void>) => ({ select: (p?: Record<string, unknown>) => ({ from: (t: PgTable) => query(t, "select", p, undefined, undo) }), insert: (t: PgTable) => ({ values: (v: MemoryRow | MemoryRow[]) => query(t, "insert", undefined, v, undo) }), update: (t: PgTable) => ({ set: (v: MemoryRow) => query(t, "update", undefined, v, undo) }), delete: (t: PgTable) => query(t, "delete", undefined, undefined, undo) });
  const db = makeDb();
  return { ...db, transaction: async <T>(fn: (tx: typeof db) => Promise<T>) => { const undo: Array<() => void> = []; try { return await fn(makeDb(undo)); } catch (error) { undo.reverse().forEach((revert) => revert()); throw error; } } };
}
const legacy = <T extends (...args: never[]) => unknown>(fn: T) => fn as unknown as (...args: unknown[]) => ReturnType<T>;
function form(values: Record<string, string>) { const data = new FormData(); Object.entries(values).forEach(([k, v]) => data.set(k, v)); return data; }

describe("server action authorization", () => {
  beforeEach(() => {
    state.actor = A;
    state.sessions = [];
    state.pauseInviteSelect = null;
    vi.stubGlobal("React", React);
    state.rows = { users: [A, B, C].map((id) => ({ id, name: id === A ? "Alice" : "Private Bob", partnerId: null, partnerInviteCode: id === B ? "BOBCOD" : null, subscriptionTier: "free", subscriptionSource: null, alphaWeight: ".5", betaWeight: ".5", pillarVitalityWeight: ".25", pillarGrowthWeight: ".25", pillarSecurityWeight: ".25", pillarConnectionWeight: ".25", relEmotionalWeight: ".2", relTrustWeight: ".2", relFairnessWeight: ".2", relStressWeight: ".2", relAutonomyWeight: ".2" })), tasks: [{ id: resource, createdById: B, assigneeId: B, status: "pending" }], constraints: [{ id: resource, userId: B, isActive: true }], scenario_profiles: [{ id: resource, userId: B, mode: "exam" }], daily_logs: [{ id: resource, userId: B, date: "2099-01-01", notes: "Bob private" }], scores: [{ id: resource, userId: B, date: "2099-01-01", lifeScore: "9", relScore: "9", totalQuality: "9" }], weekly_checkins: [{ id: resource, userId: B, highlight: "Bob private" }] };
    state.db = memoryDb();
    state.rows.coaching_sessions = [{ id: resource, userId: B, messages: [{ role: "user", content: "Bob private", timestamp: "2099-01-01" }] }];
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("REVENUECAT_SECRET_KEY", "test-only-placeholder");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ subscriber: { entitlements: { premium: { expires_date: null, product_identifier: "test" } } } }) })));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("cannot change another user's task, and treats absent and foreign IDs equally", async () => {
    expect(await updateTaskStatus(resource, "done")).toEqual(await updateTaskStatus(missing, "done"));
    expect(state.rows.tasks[0].status).toBe("pending");
  });
  it("cannot toggle or delete another user's constraint", async () => {
    await toggleConstraint(resource, false); await removeConstraint(resource);
    expect(state.rows.constraints).toEqual([{ id: resource, userId: B, isActive: true }]);
  });
  it("ignores forged actor fields when creating logs, exercises, constraints and tasks", async () => {
    await legacy(submitDailyLog)({ ...daily, userId: B });
    await legacy(completeExercise)({ userId: B, exerciseId: "test", title: "Practice", theoryBasis: "test", targetDimension: "trust", rating: 4 });
    await addConstraint(form({ userId: B, name: "Boundary", type: "redline", dimension: "trust", minValue: "2" }));
    await legacy(createTask)({ createdById: B, title: "Rest", effortPoints: 3 });
    expect(state.rows.daily_logs.filter((r) => r.id !== resource).every((r) => r.userId === A)).toBe(true);
    expect(state.rows.interventions[0].userId).toBe(A);
    expect(state.rows.constraints[1].userId).toBe(A);
    expect(state.rows.tasks[1].createdById).toBe(A);
  });
  it("rejects assignment to an unrelated user", async () => {
    await expect(createTask({ title: "Rest", effortPoints: 3, assigneeId: B })).rejects.toThrow();
    expect(state.rows.tasks).toHaveLength(1);
  });
  it("permits self and reciprocal linked-partner assignment, but rejects a stale link", async () => {
    state.rows.users[0].partnerId = B; state.rows.users[1].partnerId = A;
    await createTask({ title: "Self", effortPoints: 1, assigneeId: A });
    await createTask({ title: "Partner", effortPoints: 1, assigneeId: B });
    expect(state.rows.tasks.slice(1).map((r) => r.assigneeId)).toEqual([A, B]);
    state.rows.users[1].partnerId = C;
    await expect(createTask({ title: "Stale", effortPoints: 1, assigneeId: B })).rejects.toThrow();
  });
  it("permits an owned task update and an owned constraint deletion", async () => {
    state.rows.tasks[0].createdById = A; state.rows.constraints[0].userId = A;
    await updateTaskStatus(resource, "done"); await removeConstraint(resource);
    expect(state.rows.tasks[0].status).toBe("done"); expect(state.rows.constraints).toEqual([]);
  });
  it("cannot export another user's records through a legacy ID argument", async () => {
    const result = await legacy(exportData)(B);
    expect(result.dailyLogs).toEqual([]); expect(result.scores).toEqual([]); expect(result.weeklyCheckins).toEqual([]);
  });
  it("cannot read unrelated partner data", async () => {
    const result = await legacy(getPartnerData)(B, 30);
    expect(result).toEqual({ partner: null, scores: [], logs: [] });
  });
  it("uses only the reciprocal session-linked partner for comparison", async () => {
    state.rows.users[0].partnerId = B; state.rows.users[1].partnerId = A;
    const result = await legacy(getPartnerData)(30);
    expect(result.partner?.id).toBe(B); expect(result.logs).toHaveLength(1);
    state.rows.users[1].partnerId = C;
    expect(await legacy(getPartnerData)(30)).toEqual({ partner: null, scores: [], logs: [] });
  });
  it("ignores a forged profile userId and does not overwrite Bob", async () => {
    await updateProfile(form({ userId: B, name: "Renamed" }));
    expect(state.rows.users[0].name).toBe("Renamed"); expect(state.rows.users[1].name).toBe("Private Bob");
  });
  it("cannot activate another user's scenario", async () => {
    await legacy(activateScenario)(resource, "exam");
    await legacy(activateScenario)(B, resource, "exam").catch(() => {});
    expect(state.rows.users[0].activeScenarioId).toBeUndefined(); expect(state.rows.users[1].activeScenarioId).toBeUndefined();
  });
  it("activates a preset as an owned UUID profile and permits its owner to reactivate it", async () => {
    await activateScenario("scenario-exam", "exam");
    const own = state.rows.scenario_profiles[1];
    expect(own.userId).toBe(A); expect(own.id).toMatch(/^[0-9a-f-]{36}$/); expect(own.mode).toBe("exam");
    expect(state.rows.users[0].activeScenarioId).toBe(own.id);
    await activateScenario(own.id as string, "exam");
    expect(state.rows.users[0].alphaWeight).toBe("0.65");
  });
  it("allows the assignee to complete a shared task", async () => {
    state.rows.tasks[0].assigneeId = A;
    await updateTaskStatus(resource, "done");
    expect(state.rows.tasks[0].status).toBe("done");
  });
  it("unlinks a reciprocal partner but does not clear an unrelated partner's link", async () => {
    state.rows.users[0].partnerId = B; state.rows.users[1].partnerId = A;
    await unlinkPartner();
    expect(state.rows.users[0].partnerId).toBeNull(); expect(state.rows.users[1].partnerId).toBeNull();
    state.rows.users[0].partnerId = B; state.rows.users[1].partnerId = C; state.rows.users[2].partnerId = B;
    await unlinkPartner();
    expect(state.rows.users[0].partnerId).toBeNull(); expect(state.rows.users[1].partnerId).toBe(C); expect(state.rows.users[2].partnerId).toBe(B);
  });
  it("does not steal a linked account using an invitation that remains on the row", async () => {
    state.rows.users[1].partnerId = C; state.rows.users[2].partnerId = B;
    await linkPartner("BOBCOD");
    expect(state.rows.users[0].partnerId).toBeNull(); expect(state.rows.users[1].partnerId).toBe(C);
  });
  it("updates only session-owned weights and weekly check-ins", async () => {
    await updateWeights({ ...weights, alpha: .6, beta: .4 });
    await submitWeeklyCheckin(weekly).catch((error) => { if (error.message !== "Redirect:/overview") throw error; });
    expect(state.rows.users[0].alphaWeight).toBe("0.6"); expect(state.rows.users[1].alphaWeight).toBe(".5");
    expect(state.rows.weekly_checkins[1].userId).toBe(A);
  });
  it("cannot write weights or onboard with a legacy forged actor argument", async () => {
    await legacy(updateWeights)(B, { ...weights, alpha: .9 }).catch(() => {});
    await legacy(completeOnboarding)(B, onboarding).catch(() => {});
    expect(state.rows.users[1].alphaWeight).toBe(".5"); expect(state.rows.users[1].onboardingCompleted).toBeUndefined();
    expect(state.rows.daily_logs).toHaveLength(1);
  });
  it("cannot link, unlink or generate invitations as another user", async () => {
    state.rows.users[1].partnerId = C; state.rows.users[2].partnerId = B;
    await legacy(generateInviteCode)(B);
    await legacy(unlinkPartner)(B);
    await legacy(linkPartner)(B, "BOBCOD").catch(() => {});
    expect(state.rows.users[1].partnerInviteCode).toBe("BOBCOD");
    expect(state.rows.users[1].partnerId).toBe(C); expect(state.rows.users[2].partnerId).toBe(B);
  });
  it("links two available users and consumes the invitation; does not steal an existing partner", async () => {
    await legacy(linkPartner)("BOBCOD");
    expect(state.rows.users[0].partnerId).toBe(B); expect(state.rows.users[1].partnerId).toBe(A); expect(state.rows.users[1].partnerInviteCode).toBeNull();
    state.actor = C;
    await legacy(linkPartner)("BOBCOD");
    expect(state.rows.users[2].partnerId).toBeNull();
  });
  it("registration consumes an invitation and reuse creates a signed-in unlinked account", async () => {
    await expect(registerAction(form({ email: "first@example.test", password: "password123", invite: "BOBCOD" }))).rejects.toThrow("Redirect:/overview?welcome=partner");
    const first = state.rows.users.find((u) => u.email === "first@example.test")!;
    expect(first.partnerId).toBe(B); expect(state.rows.users[1].partnerId).toBe(first.id);
    expect(state.rows.users[1].partnerInviteCode).toBeNull();
    await expect(registerAction(form({ email: "second@example.test", password: "password123", invite: "BOBCOD" }))).rejects.toThrow(/^Redirect:\/overview$/);
    const second = state.rows.users.find((u) => u.email === "second@example.test")!;
    expect(second.partnerId).toBeNull(); expect(state.rows.users[1].partnerId).toBe(first.id);
    expect(state.sessions).toEqual([first.id, second.id]);
  });
  it("registration does not overwrite an already-linked inviter even if its code remains", async () => {
    state.rows.users[1].partnerId = C; state.rows.users[2].partnerId = B;
    await expect(registerAction(form({ email: "new@example.test", password: "password123", invite: "BOBCOD" }))).rejects.toThrow(/^Redirect:\/overview$/);
    const newcomer = state.rows.users.find((u) => u.email === "new@example.test")!;
    expect(newcomer.partnerId).toBeNull(); expect(state.rows.users[1].partnerId).toBe(C); expect(state.rows.users[2].partnerId).toBe(B);
    expect(state.sessions).toEqual([newcomer.id]);
  });
  it("registration loses a stale invitation claim safely when dashboard redemption commits first", async () => {
    let release!: () => void;
    let read!: () => void;
    const selected = new Promise<void>((resolve) => { read = resolve; });
    const resume = new Promise<void>((resolve) => { release = resolve; });
    state.pauseInviteSelect = async () => { read(); await resume; };
    const registration = registerAction(form({ email: "racer@example.test", password: "password123", invite: "BOBCOD" })).catch((error) => error.message);
    await selected;
    await linkPartner("BOBCOD");
    release();
    expect(await registration).toBe("Redirect:/overview");
    const newcomer = state.rows.users.find((u) => u.email === "racer@example.test")!;
    expect(state.rows.users[1].partnerId).toBe(A); expect(state.rows.users[0].partnerId).toBe(B);
    expect(newcomer.partnerId).toBeNull(); expect(state.sessions).toEqual([newcomer.id]);
    expect(state.rows.users[1].partnerInviteCode).toBeNull();
  });
  it("dashboard loses a stale invitation claim safely when registration commits first", async () => {
    let release!: () => void;
    let read!: () => void;
    const selected = new Promise<void>((resolve) => { read = resolve; });
    const resume = new Promise<void>((resolve) => { release = resolve; });
    state.pauseInviteSelect = async () => { read(); await resume; };
    const dashboard = linkPartner("BOBCOD");
    await selected;
    await expect(registerAction(form({ email: "winner@example.test", password: "password123", invite: "BOBCOD" }))).rejects.toThrow("Redirect:/overview?welcome=partner");
    release(); await dashboard;
    const newcomer = state.rows.users.find((u) => u.email === "winner@example.test")!;
    expect(state.rows.users[1].partnerId).toBe(newcomer.id); expect(newcomer.partnerId).toBe(B);
    expect(state.rows.users[0].partnerId).toBeNull(); expect(state.rows.users[1].partnerInviteCode).toBeNull();
    expect(state.sessions).toEqual([newcomer.id]);
  });
  it("rolls back an invitation claim if the actor became linked before its conditional update", async () => {
    let release!: () => void;
    let read!: () => void;
    const selected = new Promise<void>((resolve) => { read = resolve; });
    const resume = new Promise<void>((resolve) => { release = resolve; });
    state.pauseInviteSelect = async () => { read(); await resume; };
    const dashboard = linkPartner("BOBCOD");
    await selected;
    state.rows.users[0].partnerId = C; state.rows.users[2].partnerId = A;
    release(); await dashboard;
    expect(state.rows.users[0].partnerId).toBe(C); expect(state.rows.users[2].partnerId).toBe(A);
    expect(state.rows.users[1].partnerId).toBeNull(); expect(state.rows.users[1].partnerInviteCode).toBe("BOBCOD");
  });
  it("the invite page consumes a successful redemption and cannot be replayed", async () => {
    await InvitePage({ params: Promise.resolve({ code: "BOBCOD" }) }).catch(() => {});
    expect(state.rows.users[0].partnerId).toBe(B); expect(state.rows.users[1].partnerId).toBe(A);
    expect(state.rows.users[1].partnerInviteCode).toBeNull();
    state.actor = C;
    await InvitePage({ params: Promise.resolve({ code: "BOBCOD" }) }).catch(() => {});
    expect(state.rows.users[2].partnerId).toBeNull(); expect(state.rows.users[1].partnerId).toBe(A);
  });
  it("the invite page cannot replace a linked inviter using a stale code", async () => {
    state.rows.users[1].partnerId = C; state.rows.users[2].partnerId = B;
    await InvitePage({ params: Promise.resolve({ code: "BOBCOD" }) }).catch(() => {});
    expect(state.rows.users[0].partnerId).toBeNull(); expect(state.rows.users[1].partnerId).toBe(C); expect(state.rows.users[2].partnerId).toBe(B);
  });
  it("synchronizes only the session actor even with a forged legacy ID", async () => {
    await legacy(syncRevenueCatEntitlement)(B);
    expect(state.rows.users[0].subscriptionTier).toBe("premium"); expect(state.rows.users[1].subscriptionTier).toBe("free");
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(A);
  });
  it("onboards only the authenticated actor", async () => {
    await legacy(completeOnboarding)({ ...onboarding, userId: B }).catch((error) => { if (error.message !== "Redirect:/overview") throw error; });
    expect(state.rows.users[0].onboardingCompleted).toBe(true); expect(state.rows.users[1].onboardingCompleted).toBeUndefined();
    expect(state.rows.daily_logs[1].userId).toBe(A);
  });
  it("validates ranges and enums before any mutation", async () => {
    await expect(submitDailyLog({ ...daily, vitality: 11 })).rejects.toThrow();
    await expect(submitWeeklyCheckin({ ...weekly, overallSatisfaction: -1 })).rejects.toThrow();
    await expect(updateTaskStatus(resource, "hacked")).rejects.toThrow();
    await expect(createTask({ title: "", effortPoints: 99 })).rejects.toThrow();
    await expect(completeExercise({ exerciseId: "test", title: "test", theoryBasis: "test", targetDimension: "unknown", rating: 6 })).rejects.toThrow();
    await expect(addConstraint(form({ name: "test", type: "unknown", dimension: "trust" }))).rejects.toThrow();
    await expect(legacy(updateWeights)({ ...weights, alpha: Infinity })).rejects.toThrow();
    expect(state.rows.tasks).toHaveLength(1); expect(state.rows.daily_logs).toHaveLength(1);
  });
  it("cannot read or overwrite another user's coaching conversation", async () => {
    const before = structuredClone(state.rows.coaching_sessions);
    const foreign = await sendCoachingMessage(resource, "My message");
    expect(foreign).toEqual({ error: "Conversation unavailable" });
    expect(await sendCoachingMessage(missing, "My message")).toEqual(foreign);
    expect(state.rows.coaching_sessions).toEqual(before);
  });
  it("permits updates to an owned coaching conversation", async () => {
    state.rows.coaching_sessions[0].userId = A;
    await sendCoachingMessage(resource, "My message");
    expect((state.rows.coaching_sessions[0].messages as Array<{ content: string }>).map((m) => m.content)).toEqual(["Bob private", "My message", "Try a check-in"]);
  });
  it.each([0, -1, 366, Infinity, NaN, 1.5])("rejects unbounded therapist-export input %s", async (daysBack) => {
    await expect(generateReport(daysBack)).rejects.toThrow();
  });
  it("all action entry points require authentication before data access", async () => {
    state.actor = "";
    const actions: Array<() => Promise<unknown>> = [() => submitDailyLog(daily), () => submitWeeklyCheckin(weekly), () => createTask({ title: "test", effortPoints: 1 }), () => updateTaskStatus(resource, "done"), () => completeExercise({ exerciseId: "test", title: "test", theoryBasis: "test", targetDimension: "trust", rating: 4 }), () => addConstraint(form({ name: "test", type: "redline", dimension: "trust" })), () => toggleConstraint(resource, false), () => removeConstraint(resource), () => legacy(activateScenario)(resource, "exam"), () => legacy(generateInviteCode)(), () => legacy(linkPartner)("BOBCOD"), () => legacy(unlinkPartner)(), () => legacy(getPartnerData)(30), () => updateProfile(form({ name: "test" })), () => legacy(updateWeights)(weights), () => legacy(exportData)(), () => legacy(completeOnboarding)(onboarding), () => legacy(syncRevenueCatEntitlement)()];
    actions.push(() => sendCoachingMessage(resource, "test"), () => generateReport(30));
    for (const action of actions) await expect(action()).rejects.toThrow("Unauthorized");
  });
});
