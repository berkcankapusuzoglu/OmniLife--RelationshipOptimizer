import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import {
  ENTITLEMENT_ID,
  PRODUCT_IDS,
  fetchSubscriber,
  reconcileRevenueCatUser,
  resolveFromSubscriber,
  type RCSubscriber,
} from "@/lib/revenuecat/reconcile";

type Row = Record<string, unknown>;
const state = vi.hoisted(() => ({ rows: [] as Array<Record<string, unknown>>, reads: 0, writes: [] as string[] }));

// Real Drizzle predicates are compiled and evaluated against in-memory rows so a
// missing ownership guard shows up as a mutated row, not a changed spy argument.
function evaluate(predicate: SQL | undefined, row: Row) {
  if (!predicate) return true;
  const compiled = new PgDialect().sqlToQuery(predicate);
  const expression = compiled.sql
    .replace(/"users"\."([a-z_]+)"/g, (_, column) => {
      const value = row[column];
      return JSON.stringify(value instanceof Date ? value.toISOString() : value ?? null);
    })
    .replace(/\$(\d+)/g, (_, index) => {
      const value = compiled.params[Number(index) - 1];
      return JSON.stringify(value instanceof Date ? value.toISOString() : value);
    })
    .replace(/\bis null\b/gi, "=== null")
    .replace(/(?<![<>!=])=(?!=)/g, "===")
    .replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");
  // SQL comparisons against NULL are never true; JS would coerce null to 0.
  const guarded = expression.replace(/null\s*(<=|>=|<|>)\s*("[^"]*"|null)/g, "false").replace(/("[^"]*")\s*(<=|>=|<|>)\s*null/g, "false");
  return Function(`return (${guarded})`)() as boolean;
}
function snake(key: string) { return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`); }

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDb: () => ({
  update: () => ({ set: (values: Row) => ({ where: (predicate: SQL) => ({ returning: async () => {
    state.writes.push(new PgDialect().sqlToQuery(predicate).sql);
    const matched = state.rows.filter((row) => evaluate(predicate, row));
    for (const row of matched) for (const [key, value] of Object.entries(values)) row[snake(key)] = value;
    return matched.map((row) => ({ id: row.id }));
  } }) }) }),
  select: () => ({ from: () => ({ where: (predicate: SQL) => ({ limit: async () => {
    state.reads++;
    return state.rows.filter((row) => evaluate(predicate, row)).map((row) => ({ subscriptionSource: row.subscription_source, subscriptionExpiresAt: row.subscription_expires_at }));
  } }) }) }),
}) }));

const now = new Date("2026-10-19T12:00:00Z");
const past = "2026-10-01T00:00:00Z";
const soon = "2026-11-19T12:00:00Z";
const later = "2026-12-19T12:00:00Z";

type Entitlement = RCSubscriber["entitlements"][string];
type Subscription = NonNullable<RCSubscriber["subscriptions"]>[string];
function subscriber(overrides: { entitlement?: Partial<Entitlement>; subscription?: Partial<Subscription>; entitlementId?: string; product?: string } = {}): RCSubscriber {
  const product = overrides.product ?? "premium_monthly";
  return {
    entitlements: { [overrides.entitlementId ?? ENTITLEMENT_ID]: { expires_date: soon, purchase_date: past, product_identifier: product, grace_period_expires_date: null, ...overrides.entitlement } },
    subscriptions: { [product]: { expires_date: soon, purchase_date: past, period_type: "normal", store: "play_store", billing_issues_detected_at: null, grace_period_expires_date: null, refunded_at: null, unsubscribe_detected_at: null, ...overrides.subscription } },
  };
}
function row(overrides: Row = {}): Row {
  return { id: "user-a", subscription_tier: "free", subscription_source: null, subscription_expires_at: null, billing_product_id: null, billing_trial_ends_at: null, ...overrides };
}
function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  state.rows = [row()]; state.reads = 0; state.writes = [];
  vi.stubEnv("REVENUECAT_SECRET_KEY", "test-rc-server");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("constants", () => {
  it("maps the sold products and the legacy pro products", () => {
    expect(ENTITLEMENT_ID).toBe("premium");
    expect(PRODUCT_IDS).toEqual({ premium_monthly: "premium", premium_yearly: "premium", pro_monthly: "pro", pro_yearly: "pro" });
  });
});

describe("resolveFromSubscriber", () => {
  it("resolves a normal purchase", () => {
    expect(resolveFromSubscriber(subscriber(), now)).toEqual({ tier: "premium", expiresAt: new Date(soon), productId: "premium_monthly", trialEndsAt: null, billingIssue: false });
  });
  it("mirrors a store trial into trialEndsAt", () => {
    const resolved = resolveFromSubscriber(subscriber({ subscription: { period_type: "trial" } }), now);
    expect(resolved.tier).toBe("premium"); expect(resolved.trialEndsAt).toEqual(new Date(soon));
  });
  it("keeps a cancelled subscription active until its period ends", () => {
    const resolved = resolveFromSubscriber(subscriber({ subscription: { unsubscribe_detected_at: past } }), now);
    expect(resolved.tier).toBe("premium"); expect(resolved.expiresAt).toEqual(new Date(soon));
  });
  it("extends expiry through a billing grace period and flags the issue", () => {
    const resolved = resolveFromSubscriber(subscriber({ entitlement: { expires_date: past, grace_period_expires_date: later }, subscription: { expires_date: past, billing_issues_detected_at: past, grace_period_expires_date: later } }), now);
    expect(resolved).toEqual({ tier: "premium", expiresAt: new Date(later), productId: "premium_monthly", trialEndsAt: null, billingIssue: true });
  });
  it("treats an elapsed period (account hold / expiry) as free", () => {
    const resolved = resolveFromSubscriber(subscriber({ entitlement: { expires_date: past }, subscription: { expires_date: past, billing_issues_detected_at: past } }), now);
    expect(resolved.tier).toBe("free"); expect(resolved.expiresAt).toBeNull(); expect(resolved.productId).toBeNull();
  });
  it("treats a refund as free even if the entitlement still carries a future date", () => {
    const resolved = resolveFromSubscriber(subscriber({ subscription: { refunded_at: past } }), now);
    expect(resolved.tier).toBe("free");
  });
  it("resolves legacy pro entitlements as pro and prefers premium over pro", () => {
    const pro = subscriber({ entitlementId: "pro", product: "pro_monthly" });
    expect(resolveFromSubscriber(pro, now).tier).toBe("pro");
    const both: RCSubscriber = { entitlements: { ...pro.entitlements, ...subscriber().entitlements }, subscriptions: { ...pro.subscriptions, ...subscriber().subscriptions } };
    expect(resolveFromSubscriber(both, now).tier).toBe("premium");
  });
  it("resolves a Play base-plan product id through the entitlement, with no subscriptions block", () => {
    const resolved = resolveFromSubscriber({ entitlements: { premium: { expires_date: soon, purchase_date: past, product_identifier: "premium:premium-yearly" } } }, now);
    expect(resolved).toMatchObject({ tier: "premium", productId: "premium:premium-yearly", trialEndsAt: null, billingIssue: false });
  });
  it("ignores unknown entitlements and empty subscribers", () => {
    expect(resolveFromSubscriber(subscriber({ entitlementId: "gold" }), now).tier).toBe("free");
    expect(resolveFromSubscriber({ entitlements: {}, subscriptions: {} }, now).tier).toBe("free");
  });
  it("returns a null expiry for a lifetime entitlement so no lifecycle write is made", () => {
    const resolved = resolveFromSubscriber(subscriber({ entitlement: { expires_date: null }, subscription: { expires_date: null } }), now);
    expect(resolved.tier).toBe("premium"); expect(resolved.expiresAt).toBeNull();
  });
});

describe("fetchSubscriber", () => {
  it("calls the REST API with the secret key, android platform and no caching", async () => {
    const fetchMock = stubFetch({ subscriber: subscriber() });
    const result = await fetchSubscriber("user a/b");
    expect(result?.entitlements.premium.product_identifier).toBe("premium_monthly");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { cache: string }];
    expect(url).toBe("https://api.revenuecat.com/v1/subscribers/user%20a%2Fb");
    expect(init.cache).toBe("no-store");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-rc-server");
    expect((init.headers as Record<string, string>)["X-Platform"]).toBe("android");
  });
  it("returns null on 404 and throws on 5xx, network failure or a missing key", async () => {
    stubFetch({ message: "not found" }, 404);
    expect(await fetchSubscriber("user-a")).toBeNull();
    stubFetch({ message: "boom" }, 500);
    await expect(fetchSubscriber("user-a")).rejects.toThrow(/500/);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNRESET"); }));
    await expect(fetchSubscriber("user-a")).rejects.toThrow(/ECONNRESET/);
    vi.stubEnv("REVENUECAT_SECRET_KEY", "");
    await expect(fetchSubscriber("user-a")).rejects.toThrow(/REVENUECAT_SECRET_KEY/);
  });
});

describe("reconcileRevenueCatUser", () => {
  it("grants an unowned free account and records product and trial", async () => {
    stubFetch({ subscriber: subscriber({ subscription: { period_type: "trial" } }) });
    expect(await reconcileRevenueCatUser("user-a", { now })).toBe("granted");
    expect(state.rows[0]).toMatchObject({ subscription_tier: "premium", subscription_source: "revenuecat", subscription_expires_at: new Date(soon), billing_product_id: "premium_monthly", billing_trial_ends_at: new Date(soon) });
    expect(state.reads).toBe(0);
  });
  it("advances an owned period on renewal and clears the trial marker", async () => {
    state.rows = [row({ subscription_tier: "premium", subscription_source: "revenuecat", subscription_expires_at: new Date(soon), billing_trial_ends_at: new Date(soon) })];
    stubFetch({ subscriber: subscriber({ entitlement: { expires_date: later }, subscription: { expires_date: later } }) });
    expect(await reconcileRevenueCatUser("user-a", { now })).toBe("advanced");
    expect(state.rows[0]).toMatchObject({ subscription_expires_at: new Date(later), billing_trial_ends_at: null });
    expect(state.reads).toBe(0);
  });
  it("advances through a grace period extension", async () => {
    state.rows = [row({ subscription_tier: "premium", subscription_source: "revenuecat", subscription_expires_at: new Date(soon) })];
    stubFetch({ subscriber: subscriber({ entitlement: { expires_date: soon, grace_period_expires_date: later }, subscription: { billing_issues_detected_at: soon, grace_period_expires_date: later } }) });
    expect(await reconcileRevenueCatUser("user-a", { now })).toBe("advanced");
    expect(state.rows[0].subscription_expires_at).toEqual(new Date(later));
  });
  it("reports unchanged for an equal-period replay and for an older period", async () => {
    state.rows = [row({ subscription_tier: "premium", subscription_source: "revenuecat", subscription_expires_at: new Date(later) })];
    stubFetch({ subscriber: subscriber({ entitlement: { expires_date: later }, subscription: { expires_date: later } }) });
    expect(await reconcileRevenueCatUser("user-a", { now })).toBe("unchanged");
    stubFetch({ subscriber: subscriber() });
    expect(await reconcileRevenueCatUser("user-a", { now })).toBe("unchanged");
    expect(state.rows[0].subscription_expires_at).toEqual(new Date(later));
  });
  it("expires an owned elapsed period (account hold) and a refund, clearing billing columns", async () => {
    for (const subscription of [{ expires_date: past, billing_issues_detected_at: past }, { refunded_at: past }]) {
      state.rows = [row({ subscription_tier: "premium", subscription_source: "revenuecat", subscription_expires_at: new Date(past), billing_product_id: "premium_monthly", billing_trial_ends_at: new Date(past) })];
      stubFetch({ subscriber: subscriber({ entitlement: { expires_date: past }, subscription }) });
      expect(await reconcileRevenueCatUser("user-a", { now })).toBe("expired");
      expect(state.rows[0]).toMatchObject({ subscription_tier: "free", subscription_source: null, subscription_expires_at: null, billing_product_id: null, billing_trial_ends_at: null });
    }
    expect(state.reads).toBe(0);
  });
  it("does not expire an unelapsed owned period when RevenueCat reports nothing", async () => {
    state.rows = [row({ subscription_tier: "premium", subscription_source: "revenuecat", subscription_expires_at: new Date(later) })];
    stubFetch({ subscriber: { entitlements: {}, subscriptions: {} } });
    expect(await reconcileRevenueCatUser("user-a", { now })).toBe("unchanged");
    expect(state.rows[0].subscription_tier).toBe("premium");
  });
  it.each(["stripe", "manual"])("never writes to a %s-owned row, for grants or revocation", async (source) => {
    const owned = row({ subscription_tier: "premium", subscription_source: source, subscription_expires_at: new Date(past) });
    state.rows = [{ ...owned }];
    stubFetch({ subscriber: subscriber({ entitlement: { expires_date: later }, subscription: { expires_date: later } }) });
    expect(await reconcileRevenueCatUser("user-a", { now })).toBe("skipped-unowned");
    expect(state.rows[0]).toEqual(owned);
    stubFetch({ subscriber: { entitlements: {}, subscriptions: {} } });
    expect(await reconcileRevenueCatUser("user-a", { now })).toBe("unchanged");
    expect(state.rows[0]).toEqual(owned);
  });
  it("never claims a paid legacy row with unknown ownership", async () => {
    const legacy = row({ subscription_tier: "pro", subscription_source: null, subscription_expires_at: null });
    state.rows = [{ ...legacy }];
    stubFetch({ subscriber: subscriber() });
    expect(await reconcileRevenueCatUser("user-a", { now })).toBe("skipped-unowned");
    expect(state.rows[0]).toEqual(legacy);
  });
  it("only touches the addressed user", async () => {
    state.rows = [row(), row({ id: "user-b" })];
    stubFetch({ subscriber: subscriber() });
    await reconcileRevenueCatUser("user-b", { now });
    expect(state.rows[0].subscription_tier).toBe("free"); expect(state.rows[1].subscription_tier).toBe("premium");
  });
  it("returns unchanged on 404 and for a lifetime entitlement, and propagates 5xx", async () => {
    stubFetch({}, 404);
    expect(await reconcileRevenueCatUser("user-a", { now })).toBe("unchanged");
    stubFetch({ subscriber: subscriber({ entitlement: { expires_date: null }, subscription: { expires_date: null } }) });
    expect(await reconcileRevenueCatUser("user-a", { now })).toBe("unchanged");
    expect(state.writes).toEqual([]);
    stubFetch({}, 503);
    await expect(reconcileRevenueCatUser("user-a", { now })).rejects.toThrow(/503/);
    expect(state.rows[0].subscription_tier).toBe("free");
  });
});
