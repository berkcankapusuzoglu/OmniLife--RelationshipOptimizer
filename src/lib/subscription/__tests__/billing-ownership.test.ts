import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { POST as revenuecat } from "@/app/api/revenuecat/webhook/route";
import { POST as stripe } from "@/app/api/stripe/webhook/route";
import { syncRevenueCatEntitlement } from "@/lib/revenuecat/sync";

const state = vi.hoisted(() => ({ row: {} as Record<string, unknown>, event: {} as Record<string, unknown>, beforeWrite: undefined as (() => void) | undefined, queries: [] as Array<{ sql: string; params: unknown[] }>, reads: 0 }));

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
vi.mock("@/lib/db", () => ({ getDb: () => ({
  update: () => ({ set: (values: Record<string, unknown>) => ({ where: async (predicate: SQL) => {
    state.beforeWrite?.(); state.beforeWrite = undefined;
    if (matches(predicate)) for (const [key, value] of Object.entries(values)) state.row[key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)] = value;
  } }) }),
  select: () => ({ from: () => ({ where: () => ({ limit: async () => { state.reads++; return [{ subscriptionSource: state.row.subscription_source }]; } }) }) }),
}) }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ webhooks: { constructEvent: () => state.event } }) }));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => ({ id: "user-test" }) }));

const future = new Date("2099-01-01T00:00:00Z");
function row(source: string | null, tier = "premium") {
  return { id: "user-test", subscription_source: source, subscription_tier: tier, subscription_expires_at: future, stripe_customer_id: "cus_test", stripe_subscription_id: "sub_test", stripe_pending_checkout_token: "token_test", stripe_pending_checkout_session_id: "cs_test" };
}
async function rc(type: string, expiry: number | null = Date.parse(type === "EXPIRATION" ? "2020-01-01" : "2100-01-01")) {
  return revenuecat(new NextRequest("https://example.test/api/revenuecat/webhook", { method: "POST", headers: { Authorization: "test-rc-auth" }, body: JSON.stringify({ event: { type, app_user_id: "user-test", product_id: "pro_monthly", expiration_at_ms: expiry } }) }));
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
  state.row = row("stripe"); state.queries = []; state.reads = 0; state.beforeWrite = undefined;
  vi.stubEnv("REVENUECAT_WEBHOOK_SECRET", "test-rc-auth"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-stripe-auth"); vi.stubEnv("REVENUECAT_SECRET_KEY", "test-rc-server");
  vi.stubEnv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_pro_monthly"); vi.stubEnv("STRIPE_PRO_YEARLY_PRICE_ID", "price_pro_yearly"); vi.stubEnv("STRIPE_MONTHLY_PRICE_ID", "price_premium_monthly"); vi.stubEnv("STRIPE_YEARLY_PRICE_ID", "price_premium_yearly");
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ subscriber: { entitlements: {} } }) })));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

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
    await rc("EXPIRATION"); expect(state.row.subscription_expires_at).toEqual(future); expect(state.row.subscription_tier).toBe("premium"); expect(state.reads).toBe(0);
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
    state.row = row("revenuecat"); await rc("RENEWAL"); expect(state.row.subscription_tier).toBe("pro");
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
