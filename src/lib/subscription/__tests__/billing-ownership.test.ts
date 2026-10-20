import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { POST as revenuecat } from "@/app/api/revenuecat/webhook/route";
import { POST as stripe } from "@/app/api/stripe/webhook/route";
import { syncRevenueCatEntitlement } from "@/lib/revenuecat/sync";

// `reads` counts SELECTs; `readsBeforeWrite` is the highest `reads` observed when any
// UPDATE ran, so a diagnostic read *after* a guarded write never masks a preflight read.
// `events` is the billing_events idempotency ledger; `subscriber` is the REST snapshot.
const state = vi.hoisted(() => ({ row: {} as Record<string, unknown>, event: {} as Record<string, unknown>, beforeWrite: undefined as (() => void) | undefined, queries: [] as Array<{ sql: string; params: unknown[] }>, reads: 0, readsBeforeWrite: 0, events: new Set<string>(), subscriber: null as unknown, eventSeq: 0 }));

// Evaluate the actual Drizzle WHERE expression against the row at write time.
// A preflight SELECT cannot make an unconditional UPDATE pass these tests.
function matches(predicate: SQL) {
  const query = new PgDialect().sqlToQuery(predicate);
  state.queries.push(query);
  const tokens = query.sql.match(/"users"\."[a-z_]+"|\$\d+|\(|\)|<=|>=|=|<|>|\band\b|\bor\b|\bis\b|\bnull\b/gi) ?? [];
  let position = 0;
  function atom(): boolean {
    if (tokens[position] === "(") { position++; const result = expression(); expect(tokens[position++]).toBe(")"); return result; }
    const column = tokens[position++].split('"')[3];
    const operator = tokens[position++];
    if (operator === "is") { expect(tokens[position++]).toBe("null"); return state.row[column] == null; }
    const value = query.params[Number(tokens[position++].slice(1)) - 1];
    const original = state.row[column];
    if (original == null) return false;
    const left = original instanceof Date ? original.getTime() : original as string | number;
    const right = original instanceof Date ? new Date(value as string).getTime() : value as string | number;
    switch (operator) {
      case "=": return left === right;
      case "<": return left < right;
      case "<=": return left <= right;
      case ">": return left > right;
      case ">=": return left >= right;
      default: throw new Error(`Unsupported SQL comparison: ${operator}`);
    }
  }
  function conjunction(): boolean {
    let result = atom();
    while (tokens[position] === "and") { position++; const right = atom(); result = result && right; }
    return result;
  }
  function expression(): boolean {
    let result = conjunction();
    while (tokens[position] === "or") { position++; const right = conjunction(); result = result || right; }
    return result;
  }
  const result = expression();
  expect(position).toBe(tokens.length);
  return result;
}
function param(predicate: SQL) { return String(new PgDialect().sqlToQuery(predicate).params[0]); }
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDb: () => ({
  update: () => ({ set: (values: Record<string, unknown>) => ({ where: (predicate: SQL) => {
    const write = async () => {
      state.beforeWrite?.(); state.beforeWrite = undefined;
      state.readsBeforeWrite = Math.max(state.readsBeforeWrite, state.reads);
      if (!matches(predicate)) return [];
      for (const [key, value] of Object.entries(values)) state.row[key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)] = value;
      return [{ id: state.row.id }];
    };
    return { returning: write, then: (ok: (value: unknown) => unknown, fail: (reason: unknown) => unknown) => write().then(() => undefined).then(ok, fail) };
  } }) }),
  select: () => ({ from: () => ({ where: () => ({ limit: async () => { state.reads++; return [{ subscriptionSource: state.row.subscription_source, subscriptionExpiresAt: state.row.subscription_expires_at }]; } }) }) }),
  insert: () => ({ values: (values: { id: string }) => ({ onConflictDoNothing: () => ({ returning: async () => { if (state.events.has(values.id)) return []; state.events.add(values.id); return [{ id: values.id }]; } }) }) }),
  delete: () => ({ where: async (predicate: SQL) => { state.events.delete(param(predicate)); } }),
}) }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ webhooks: { constructEvent: () => state.event } }) }));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => ({ id: "user-test" }) }));

const future = new Date("2099-01-01T00:00:00Z");
function row(source: string | null, tier = "premium") {
  return { id: "user-test", subscription_source: source, subscription_tier: tier, subscription_expires_at: future, stripe_customer_id: "cus_test", stripe_subscription_id: "sub_test", stripe_pending_checkout_token: "token_test", stripe_pending_checkout_session_id: "cs_test" };
}
// The webhook never trusts event fields: the RevenueCat REST snapshot is the
// source of truth, so each event also seeds the subscriber the REST mock returns.
function snapshot(expiry: number | null, product = "pro_monthly", entitlement = "pro", extra: Record<string, unknown> = {}) {
  const expires_date = expiry === null ? null : new Date(expiry).toISOString();
  return { entitlements: { [entitlement]: { expires_date, product_identifier: product, purchase_date: "2020-01-01T00:00:00Z" } }, subscriptions: { [product]: { expires_date, period_type: "normal", store: "play_store", ...extra } } };
}
async function rc(type: string, expiry: number | null = Date.parse(type === "EXPIRATION" ? "2020-01-01" : "2099-01-01"), event: Record<string, unknown> = {}) {
  state.subscriber = snapshot(expiry); state.reads = 0;
  return revenuecat(new NextRequest("https://example.test/api/revenuecat/webhook", { method: "POST", headers: { Authorization: "test-rc-auth" }, body: JSON.stringify({ event: { id: `evt_${++state.eventSeq}`, type, app_user_id: "user-test", product_id: "pro_monthly", expiration_at_ms: expiry, ...event } }) }));
}
async function checkoutEvent(subscription = "sub_test", token = "token_test", session = "cs_test") {
  state.event = { type: "checkout.session.completed", data: { object: { id: session, mode: "subscription", payment_status: "paid", client_reference_id: "user-test", customer: "cus_test", subscription, metadata: { tier: "pro", checkoutToken: token } } } };
  return stripe(new NextRequest("https://example.test/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "test-signature" }, body: "test-event" }));
}
async function stripeEvent(type: string, status = "active", subscriptionId = "sub_test", priceId = "price_pro_monthly", checkoutToken?: string) {
  state.event = { type, data: { object: { id: subscriptionId, customer: "cus_test", status, metadata: checkoutToken ? { checkoutToken, appUserId: "user-test" } : {}, current_period_end: Date.parse("2099-01-01") / 1000, items: { data: [{ price: { id: priceId } }] } } } };
  return stripe(new NextRequest("https://example.test/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "test-signature" }, body: "test-event" }));
}
beforeEach(() => {
  state.row = row("stripe"); state.queries = []; state.reads = 0; state.readsBeforeWrite = 0; state.beforeWrite = undefined; state.events = new Set(); state.subscriber = null;
  vi.stubEnv("REVENUECAT_WEBHOOK_SECRET", "test-rc-auth"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-stripe-auth"); vi.stubEnv("REVENUECAT_SECRET_KEY", "test-rc-server");
  vi.stubEnv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_pro_monthly"); vi.stubEnv("STRIPE_PRO_YEARLY_PRICE_ID", "price_pro_yearly"); vi.stubEnv("STRIPE_MONTHLY_PRICE_ID", "price_premium_monthly"); vi.stubEnv("STRIPE_YEARLY_PRICE_ID", "price_premium_yearly");
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ subscriber: state.subscriber ?? { entitlements: {}, subscriptions: {} } }) })));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("manual ownership", () => {
  it.each([future, null])("preserves a manual grant with expiry %s through provider webhooks and sync", async expiry => {
    state.row = { ...row("manual"), subscription_expires_at: expiry, stripe_customer_id: null, stripe_subscription_id: null };
    const original = { ...state.row };
    for (const type of ["CANCELLATION", "EXPIRATION", "INITIAL_PURCHASE", "RENEWAL"]) { await rc(type); expect(state.row).toEqual(original); }
    await syncRevenueCatEntitlement(); expect(state.row).toEqual(original);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ subscriber: { entitlements: { pro: { expires_date: "2100-01-01", product_identifier: "pro_monthly" } } } }) })));
    await syncRevenueCatEntitlement(); expect(state.row).toEqual(original);
    for (const type of ["customer.subscription.updated", "customer.subscription.deleted"]) { await stripeEvent(type); expect(state.row).toEqual(original); }
    await checkoutEvent(); expect(state.row).toEqual(original);
  });
});

describe("RevenueCat ownership", () => {
  it.each(["CANCELLATION", "EXPIRATION", "INITIAL_PURCHASE", "RENEWAL"])("does not mutate Stripe access on %s", async type => {
    const original = { ...state.row };
    expect((await rc(type)).status).toBe(200);
    expect(state.row).toEqual(original);
  });
  it.each(["CANCELLATION", "EXPIRATION", "INITIAL_PURCHASE", "RENEWAL"])("leaves an ambiguous paid legacy row unchanged on %s", async type => {
    state.row = row(null); const original = { ...state.row };
    await rc(type); expect(state.row).toEqual(original);
  });
  it.each(["INITIAL_PURCHASE", "RENEWAL"])("allows %s to claim an unowned free account", async type => {
    state.row = row(null, "free"); await rc(type);
    expect(state.row.subscription_source).toBe("revenuecat"); expect(state.row.subscription_tier).toBe("pro");
  });
  it("keeps owned access on cancellation and expires only owned access", async () => {
    state.row = row("revenuecat"); await rc("CANCELLATION");
    expect(state.row.subscription_tier).toBe("premium"); expect(state.row.subscription_expires_at).toEqual(future);
    state.row.subscription_expires_at = new Date("2020-01-01");
    await rc("EXPIRATION"); expect(state.row.subscription_tier).toBe("free"); expect(state.row.subscription_source).toBeNull();
  });
  it("evaluates ownership atomically if another provider claims the row before the write", async () => {
    state.row = row("revenuecat"); state.beforeWrite = () => { state.row = row("stripe"); };
    await rc("EXPIRATION"); expect(state.row).toEqual(row("stripe")); expect(state.reads).toBe(0);
  });
  it.each(["stripe", null])("does not free-sync a paid %s row", async source => {
    state.row = row(source); const original = { ...state.row };
    await syncRevenueCatEntitlement(); expect(state.row).toEqual(original); expect(state.reads).toBe(0);
  });
  it("guards free sync at write time and permits owned reconciliation", async () => {
    state.row = row("revenuecat"); state.beforeWrite = () => { state.row = row("stripe"); };
    await syncRevenueCatEntitlement(); expect(state.row).toEqual(row("stripe"));
    state.row = row("revenuecat"); state.row.subscription_expires_at = new Date("2020-01-01"); await syncRevenueCatEntitlement(); expect(state.row.subscription_tier).toBe("free");
  });
  it.each(["stripe", null, "revenuecat"])("reconciles active sync only for eligible %s rows", async source => {
    state.row = row(source); state.row.subscription_expires_at = new Date("2080-01-01");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ subscriber: { entitlements: { pro: { expires_date: "2099-01-01", product_identifier: "pro_monthly" } } } }) })));
    await syncRevenueCatEntitlement();
    expect(state.row.subscription_tier).toBe(source === "revenuecat" ? "pro" : "premium");
  });
  it.each(["CANCELLATION", "EXPIRATION", "INITIAL_PURCHASE", "RENEWAL"])("ignores delayed %s after a newer renewal", async type => {
    state.row = row("revenuecat"); const original = { ...state.row };
    await rc(type, Date.parse(type === "EXPIRATION" ? "2020-01-01" : "2090-01-01")); expect(state.row).toEqual(original);
  });
  it.each(["INITIAL_PURCHASE", "RENEWAL"])("ignores expired %s and equal-expiry replays", async type => {
    state.row = row(null, "free"); const free = { ...state.row };
    await rc(type, Date.parse("2020-01-01")); expect(state.row).toEqual(free);
    state.row = row("revenuecat"); const paid = { ...state.row };
    await rc(type, future.getTime()); expect(state.row).toEqual(paid);
  });
  it.each(["EXPIRATION", "INITIAL_PURCHASE", "RENEWAL"])("does not mutate lifecycle state on %s without expiry evidence", async type => {
    state.row = row("revenuecat"); const original = { ...state.row }; await rc(type, null); expect(state.row).toEqual(original);
  });
  it("does not expire an unelapsed period or overwrite unknown lifetime state", async () => {
    state.row = row("revenuecat"); const original = { ...state.row }; await rc("EXPIRATION", future.getTime()); expect(state.row).toEqual(original);
    state.row.subscription_expires_at = null; const lifetime = { ...state.row }; await rc("RENEWAL"); expect(state.row).toEqual(lifetime);
  });
  it("ignores stale active and empty sync snapshots after a newer renewal", async () => {
    state.row = row("revenuecat"); const original = { ...state.row };
    await syncRevenueCatEntitlement(); expect(state.row).toEqual(original);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ subscriber: { entitlements: { pro: { expires_date: "2090-01-01", product_identifier: "pro_monthly" } } } }) })));
    await syncRevenueCatEntitlement(); expect(state.row).toEqual(original);
  });
  it("checks the RevenueCat period atomically if renewal wins immediately before the write", async () => {
    state.row = row("revenuecat"); state.row.subscription_expires_at = new Date("2080-01-01");
    state.beforeWrite = () => { state.row.subscription_expires_at = future; };
    await rc("RENEWAL", Date.parse("2090-01-01")); expect(state.row.subscription_expires_at).toEqual(future); expect(state.row.subscription_tier).toBe("premium");
    state.row.subscription_expires_at = new Date("2020-01-01");
    state.beforeWrite = () => { state.row.subscription_expires_at = future; };
    await rc("EXPIRATION"); expect(state.row.subscription_expires_at).toEqual(future); expect(state.row.subscription_tier).toBe("premium"); expect(state.readsBeforeWrite).toBe(0);
  });
});

describe("RevenueCat webhook", () => {
  const calls = () => vi.mocked(fetch).mock.calls.map((call) => String(call[0]));
  it("rejects a missing or wrong authorization header without reading RevenueCat", async () => {
    for (const headers of [{}, { Authorization: "wrong" }] as Record<string, string>[]) {
      const res = await revenuecat(new NextRequest("https://example.test/api/revenuecat/webhook", { method: "POST", headers, body: JSON.stringify({ event: { id: "evt_x", type: "RENEWAL", app_user_id: "user-test" } }) }));
      expect(res.status).toBe(401);
    }
    expect(calls()).toEqual([]);
  });
  it("rejects malformed bodies and events without an id", async () => {
    const post = (body: string) => revenuecat(new NextRequest("https://example.test/api/revenuecat/webhook", { method: "POST", headers: { Authorization: "test-rc-auth" }, body }));
    expect((await post("{")).status).toBe(400);
    expect((await post(JSON.stringify({ event: { type: "RENEWAL", app_user_id: "user-test" } }))).status).toBe(400);
    expect((await post(JSON.stringify({ event: { id: "evt_x", app_user_id: "user-test" } }))).status).toBe(400);
    expect(calls()).toEqual([]);
  });
  it("reconciles from REST rather than event fields", async () => {
    state.row = row(null, "free");
    // Event claims a premium yearly purchase far in the future; REST says pro until 2099.
    const res = await rc("INITIAL_PURCHASE", future.getTime(), { product_id: "premium_yearly", expiration_at_ms: Date.parse("2150-01-01") });
    expect(res.status).toBe(200);
    expect(state.row.subscription_tier).toBe("pro"); expect(state.row.subscription_expires_at).toEqual(future); expect(state.row.billing_product_id).toBe("pro_monthly");
  });
  it.each(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "CANCELLATION", "EXPIRATION", "BILLING_ISSUE", "PRODUCT_CHANGE"])("reconciles %s from REST", async type => {
    state.row = row(null, "free");
    await rc(type, Date.parse("2099-01-01"));
    expect(calls()).toEqual(["https://api.revenuecat.com/v1/subscribers/user-test"]);
    expect(state.row.subscription_tier).toBe("pro");
  });
  it("acknowledges a duplicate event id without reconciling again", async () => {
    state.row = row(null, "free");
    const first = await rc("INITIAL_PURCHASE", Date.parse("2099-01-01"), { id: "evt_dup" });
    expect(await first.json()).toEqual({ received: true, results: { "user-test": "granted" } });
    state.row = row(null, "free");
    const second = await rc("INITIAL_PURCHASE", Date.parse("2099-01-01"), { id: "evt_dup" });
    expect(second.status).toBe(200); expect(await second.json()).toEqual({ duplicate: true });
    expect(calls()).toHaveLength(1); expect(state.row.subscription_tier).toBe("free");
  });
  it("treats a reordered RENEWAL as unchanged because REST already reflects the newest period", async () => {
    state.row = row("revenuecat");
    const res = await rc("RENEWAL", Date.parse("2090-01-01"), { expiration_at_ms: Date.parse("2080-01-01") });
    expect(await res.json()).toEqual({ received: true, results: { "user-test": "unchanged" } });
    expect(state.row.subscription_expires_at).toEqual(future);
  });
  it("returns 200 and writes nothing for an unknown user id or an anonymous id", async () => {
    const original = { ...state.row };
    const res = await rc("INITIAL_PURCHASE", Date.parse("2099-01-01"), { app_user_id: "someone-else" });
    expect(res.status).toBe(200); expect(await res.json()).toEqual({ received: true, results: { "someone-else": "skipped-unowned" } });
    expect(state.row).toEqual(original);
    const anonymous = await rc("INITIAL_PURCHASE", Date.parse("2099-01-01"), { app_user_id: "$RCAnonymousID:abc" });
    expect(anonymous.status).toBe(200); expect(calls()).toEqual(["https://api.revenuecat.com/v1/subscribers/someone-else"]);
  });
  it("returns 200 for a deleted RevenueCat subscriber", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    const original = { ...state.row };
    const res = await rc("EXPIRATION");
    expect(res.status).toBe(200); expect(await res.json()).toEqual({ received: true, results: { "user-test": "unchanged" } });
    expect(state.row).toEqual(original);
  });
  it("reconciles every id on TRANSFER and SUBSCRIBER_ALIAS", async () => {
    await rc("TRANSFER", Date.parse("2099-01-01"), { app_user_id: undefined, transferred_from: ["user-old"], transferred_to: ["user-test"] });
    expect(calls().sort()).toEqual(["https://api.revenuecat.com/v1/subscribers/user-old", "https://api.revenuecat.com/v1/subscribers/user-test"]);
    vi.mocked(fetch).mockClear();
    await rc("SUBSCRIBER_ALIAS", Date.parse("2099-01-01"), { aliases: ["user-test", "user-alias"] });
    expect(calls().sort()).toEqual(["https://api.revenuecat.com/v1/subscribers/user-alias", "https://api.revenuecat.com/v1/subscribers/user-test"]);
  });
  it("logs and acknowledges other event types without reconciling", async () => {
    const res = await rc("TEST", Date.parse("2099-01-01"));
    expect(res.status).toBe(200); expect(await res.json()).toEqual({ received: true, ignored: "TEST" });
    expect(calls()).toEqual([]);
  });
  it("returns 500 and releases the event id when reconciliation fails so RevenueCat retries", async () => {
    state.row = row(null, "free");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
    const failed = await rc("RENEWAL", Date.parse("2099-01-01"), { id: "evt_retry" });
    expect(failed.status).toBe(500); expect(state.events.has("evt_retry")).toBe(false); expect(state.row.subscription_tier).toBe("free");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ subscriber: state.subscriber }) })));
    const retried = await rc("RENEWAL", Date.parse("2099-01-01"), { id: "evt_retry" });
    expect(retried.status).toBe(200); expect(state.row.subscription_tier).toBe("pro");
  });
});

describe("Stripe ownership", () => {
  it.each(["customer.subscription.updated", "customer.subscription.deleted"])("does not mutate RevenueCat access on %s", async type => {
    state.row = row("revenuecat"); const original = { ...state.row };
    await stripeEvent(type, "canceled"); expect(state.row).toEqual(original);
  });
  it("does not steal an owned RevenueCat entitlement on renewal", async () => {
    state.row = row("revenuecat"); const original = { ...state.row };
    await stripeEvent("customer.subscription.updated"); expect(state.row).toEqual(original);
  });
  it.each(["customer.subscription.updated", "customer.subscription.deleted"])("protects null legacy paid access on %s", async type => {
    state.row = row(null); const original = { ...state.row };
    await stripeEvent(type, "canceled"); expect(state.row).toEqual(original);
  });
  it.each(["customer.subscription.updated", "customer.subscription.deleted"])("ignores a superseded subscription on %s", async type => {
    const original = { ...state.row }; await stripeEvent(type, "canceled", "sub_old"); expect(state.row).toEqual(original);
  });
  it.each(["customer.subscription.updated", "customer.subscription.deleted"])("checks the provider atomically for %s", async type => {
    state.beforeWrite = () => { state.row = row("revenuecat"); };
    await stripeEvent(type, "canceled"); expect(state.row).toEqual(row("revenuecat")); expect(state.reads).toBe(0);
  });
  it("renews an owned subscription with the correct tier", async () => {
    await stripeEvent("customer.subscription.updated"); expect(state.row.subscription_tier).toBe("pro"); expect(state.row.subscription_source).toBe("stripe");
  });
  it("retains Stripe ownership during a failed payment so recovery can restore access", async () => {
    await stripeEvent("customer.subscription.updated", "past_due");
    expect(state.row.subscription_tier).toBe("free"); expect(state.row.subscription_source).toBe("stripe");
    await stripeEvent("customer.subscription.updated", "active");
    expect(state.row.subscription_tier).toBe("pro"); expect(state.row.subscription_source).toBe("stripe");
  });
  it("does not claim a paid null-source legacy entitlement on active Stripe renewal", async () => {
    state.row = row(null); const original = { ...state.row };
    await stripeEvent("customer.subscription.updated"); expect(state.row).toEqual(original);
  });
  it("allows an owned RevenueCat purchase to renew and atomically guards its grant", async () => {
    state.row = row("revenuecat"); await rc("RENEWAL", Date.parse("2100-01-01")); expect(state.row.subscription_tier).toBe("pro");
    state.row = row(null, "free"); state.beforeWrite = () => { state.row = row("stripe"); };
    await rc("INITIAL_PURCHASE"); expect(state.row).toEqual(row("stripe"));
  });
  it("checks ownership at write time for an explicit Stripe checkout grant", async () => {
    state.row = row(null, "free"); state.beforeWrite = () => { state.row = row("revenuecat"); };
    await checkoutEvent();
    expect(state.row).toEqual(row("revenuecat"));
  });
  it("does not classify an unknown Stripe price as Premium", async () => {
    const original = { ...state.row }; await stripeEvent("customer.subscription.updated", "active", "sub_test", "price_unknown"); expect(state.row).toEqual(original);
  });
  it("clears access only for an owned matching subscription", async () => {
    await stripeEvent("customer.subscription.deleted", "canceled"); expect(state.row.subscription_tier).toBe("free"); expect(state.row.subscription_source).toBeNull(); expect(state.row.subscription_expires_at).toBeNull();
  });
  it.each(["stripe", "revenuecat", null])("defines checkout ownership transitions from %s", async source => {
    state.row = row(source, source === null ? "free" : "premium");
    await checkoutEvent();
    expect(state.row.subscription_source).toBe(source === "revenuecat" ? "revenuecat" : "stripe");
    expect(state.row.subscription_tier).toBe(source === "revenuecat" ? "premium" : "pro");
    if (source !== "revenuecat") expect(state.row.subscription_expires_at).toBeNull();
  });
  it("cannot replay checkout A over a newer B binding or delete B through A", async () => {
    state.row = row(null, "free"); await checkoutEvent("sub_A");
    state.row.stripe_pending_checkout_token = "token_B"; state.row.stripe_pending_checkout_session_id = "cs_B";
    await checkoutEvent("sub_B", "token_B", "cs_B"); const boundB = { ...state.row };
    await checkoutEvent("sub_A"); expect(state.row).toEqual(boundB);
    await stripeEvent("customer.subscription.deleted", "canceled", "sub_A"); expect(state.row).toEqual(boundB);
  });
  it("consumes checkout state so completed or deleted checkouts cannot restore access", async () => {
    state.row = row(null, "free"); await checkoutEvent("sub_A"); const boundA = { ...state.row };
    await checkoutEvent("sub_A"); expect(state.row).toEqual(boundA);
    await stripeEvent("customer.subscription.deleted", "canceled", "sub_A"); const ended = { ...state.row };
    await checkoutEvent("sub_A"); expect(state.row).toEqual(ended);
    state.row.stripe_pending_checkout_token = "token_C"; state.row.stripe_pending_checkout_session_id = "cs_C";
    await checkoutEvent("sub_C", "token_C", "cs_C"); expect(state.row.stripe_subscription_id).toBe("sub_C"); expect(state.row.subscription_tier).toBe("pro");
  });
  it("requires the issued token and bound session rather than accepting arbitrary completed sessions", async () => {
    state.row = row(null, "free"); const original = { ...state.row };
    await checkoutEvent("sub_A", "wrong-token"); expect(state.row).toEqual(original);
    await checkoutEvent("sub_A", "token_test", "wrong-session"); expect(state.row).toEqual(original);
  });
  it.each(["customer.subscription.deleted", "customer.subscription.updated"])("cannot complete a pending checkout after %s ends its subscription", async type => {
    state.row = row(null, "free");
    await stripeEvent(type, "canceled", "sub_A", "price_pro_monthly", "token_test");
    const ended = { ...state.row };
    await checkoutEvent("sub_A"); expect(state.row).toEqual(ended); expect(state.row.subscription_tier).toBe("free");
  });
  it("does not invalidate a newer pending checkout when an old subscription ends", async () => {
    state.row = row("stripe"); state.row.stripe_subscription_id = "sub_A";
    state.row.stripe_pending_checkout_token = "token_B"; state.row.stripe_pending_checkout_session_id = "cs_B";
    await stripeEvent("customer.subscription.deleted", "canceled", "sub_A", "price_pro_monthly", "token_A");
    await checkoutEvent("sub_B", "token_B", "cs_B"); expect(state.row.stripe_subscription_id).toBe("sub_B"); expect(state.row.subscription_tier).toBe("pro");
  });
  it("checks the pending checkout token atomically when a newer issuance wins", async () => {
    state.row = row(null, "free");
    state.beforeWrite = () => { state.row.stripe_pending_checkout_token = "token_B"; state.row.stripe_pending_checkout_session_id = "cs_B"; };
    await checkoutEvent("sub_A"); expect(state.row.subscription_tier).toBe("free"); expect(state.row.stripe_pending_checkout_token).toBe("token_B"); expect(state.reads).toBe(0);
  });
});
