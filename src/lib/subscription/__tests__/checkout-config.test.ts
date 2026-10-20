import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/stripe/checkout/route";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { getStripePriceId, getStripeTierForPriceId } from "@/lib/stripe/config";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const state = vi.hoisted(() => ({ loggedIn: true, tier: "free", source: null as string | null, customer: null as string | null, partnerCovered: false, create: vi.fn(), initialize: vi.fn(), expire: vi.fn(), event: {} as Record<string, unknown>, pending: {} as Record<string, unknown>, writes: [] as Array<{ sql: string; params: unknown[] }>, rejectAtWrite: 0 }));
vi.mock("@/lib/auth/guard", () => ({ getCurrentUser: async () => state.loggedIn ? { id: "test-user", subscriptionTier: state.tier, subscriptionSource: state.source, stripeCustomerId: state.customer } : null }));
// Effective access as Task 1's getEntitlement would resolve it from the mocked user row.
vi.mock("@/lib/subscription/access", () => ({ getEntitlement: async (id: string) => {
  if (state.partnerCovered) return { tier: "premium", via: "partner", expiresAt: null, source: "revenuecat", ownerId: "partner-user" };
  const paid = state.tier === "pro" || state.tier === "premium";
  return { tier: paid ? state.tier : "free", via: paid ? "own" : "none", expiresAt: null, source: paid ? state.source : null, ownerId: id };
} }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => { state.initialize(); return { checkout: { sessions: { create: state.create, expire: state.expire } }, webhooks: { constructEvent: () => state.event } }; } }));
vi.mock("@/lib/db", () => ({ getDb: () => ({ update: () => ({ set: (values: Record<string, unknown>) => ({ where: (predicate: SQL) => {
  const write = async () => {
    state.writes.push(new PgDialect().sqlToQuery(predicate));
    if (state.writes.length === state.rejectAtWrite) return [];
    Object.assign(state.pending, values); return [{ id: "test-user" }];
  };
  // Checkout awaits `.returning()`; the webhook awaits the `.where()` builder directly.
  return { returning: write, then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => write().then(resolve, reject) };
} }) }) }) }));
function request(tier: unknown = "premium", priceType = "monthly") { return new NextRequest("https://example.test/api/stripe/checkout", { method: "POST", headers: { origin: "https://example.test" }, body: JSON.stringify({ tier, priceType }) }); }
function subscriptionEvent(status: string, priceId = "price_premium_monthly", trialEnd: number | null = null) {
  state.event = { type: "customer.subscription.updated", data: { object: { id: "sub_test", customer: "cus_test", status, metadata: {}, trial_end: trialEnd, current_period_end: Date.parse("2099-01-01") / 1000, items: { data: [{ price: { id: priceId } }] } } } };
  return webhook(new NextRequest("https://example.test/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "test-signature" }, body: "test-event" }));
}
const PRICE_VARIABLES = ["STRIPE_PREMIUM_MONTHLY_PRICE_ID", "STRIPE_PREMIUM_YEARLY_PRICE_ID", "STRIPE_LEGACY_PREMIUM_PRICE_IDS", "STRIPE_LEGACY_PRO_PRICE_IDS", "STRIPE_PRO_MONTHLY_PRICE_ID", "STRIPE_PRO_YEARLY_PRICE_ID", "STRIPE_MONTHLY_PRICE_ID", "STRIPE_YEARLY_PRICE_ID"];
beforeEach(() => {
  state.loggedIn = true; state.tier = "free"; state.source = null; state.customer = null; state.partnerCovered = false; state.create.mockReset().mockResolvedValue({ id: "cs_created", url: "https://checkout.example.test" }); state.initialize.mockClear();
  state.expire.mockReset().mockResolvedValue({}); state.event = {}; state.pending = {}; state.writes = []; state.rejectAtWrite = 0;
  for (const name of PRICE_VARIABLES) vi.stubEnv(name, "");
  vi.stubEnv("STRIPE_PREMIUM_MONTHLY_PRICE_ID", "price_premium_monthly"); vi.stubEnv("STRIPE_PREMIUM_YEARLY_PRICE_ID", "price_premium_yearly");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-stripe-auth");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it("authenticates before inspecting or disclosing billing configuration", async () => {
  state.loggedIn = false; const response = await POST(request());
  expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: "Unauthorized" }); expect(state.initialize).not.toHaveBeenCalled();
});
it.each(["monthly", "yearly"])("rejects Pro %s checkout before touching Stripe even when a Pro price is configured", async interval => {
  vi.stubEnv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_pro_monthly"); vi.stubEnv("STRIPE_PRO_YEARLY_PRICE_ID", "price_pro_yearly");
  expect(() => getStripePriceId(interval as "monthly" | "yearly", "pro")).toThrow();
  const response = await POST(request("pro", interval));
  expect(response.status).toBe(400); expect(await response.json()).toEqual({ error: "Invalid subscription tier" });
  expect(state.initialize).not.toHaveBeenCalled(); expect(state.writes).toHaveLength(0);
});
it.each(["monthly", "yearly"])("fails closed when the Premium %s price is missing", async interval => {
  vi.stubEnv(`STRIPE_PREMIUM_${interval.toUpperCase()}_PRICE_ID`, "");
  expect(() => getStripePriceId(interval as "monthly" | "yearly")).toThrow();
  const response = await POST(request("premium", interval));
  expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "Checkout is temporarily unavailable." }); expect(state.initialize).not.toHaveBeenCalled();
});
it("rejects a Premium price aliased to a legacy Pro price", async () => {
  vi.stubEnv("STRIPE_LEGACY_PRO_PRICE_IDS", "price_old_pro, price_premium_monthly");
  expect(getStripeTierForPriceId("price_premium_monthly")).toBeNull();
  const response = await POST(request()); expect(response.status).toBe(503); expect(state.create).not.toHaveBeenCalled();
});
it.each(["monthly", "yearly"])("uses the configured Premium %s price with matching metadata", async interval => {
  expect((await POST(request("premium", interval))).status).toBe(200);
  expect(state.create.mock.calls[0][0]).toMatchObject({ line_items: [{ price: `price_premium_${interval}`, quantity: 1 }], metadata: { tier: "premium" }, client_reference_id: "test-user", allow_promotion_codes: true });
});
it("accepts the pre-1.1.0 Premium env names as aliases for one release", async () => {
  vi.stubEnv("STRIPE_PREMIUM_MONTHLY_PRICE_ID", ""); vi.stubEnv("STRIPE_MONTHLY_PRICE_ID", "price_alias_monthly");
  expect(getStripePriceId("monthly")).toBe("price_alias_monthly");
  expect((await POST(request())).status).toBe(200);
  expect(state.create.mock.calls[0][0].line_items).toEqual([{ price: "price_alias_monthly", quantity: 1 }]);
});
it("sells the new Premium price when both new and legacy env names are set, and keeps the old one renewable", () => {
  vi.stubEnv("STRIPE_MONTHLY_PRICE_ID", "price_old_premium_monthly");
  expect(getStripePriceId("monthly")).toBe("price_premium_monthly");
  expect(getStripeTierForPriceId("price_old_premium_monthly")).toBe("premium");
});
it("resolves legacy price ids so existing subscriptions keep their tier", () => {
  vi.stubEnv("STRIPE_LEGACY_PRO_PRICE_IDS", "price_old_pro_a, price_old_pro_b"); vi.stubEnv("STRIPE_LEGACY_PREMIUM_PRICE_IDS", "price_old_premium");
  vi.stubEnv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_pro_monthly");
  expect(getStripeTierForPriceId("price_old_pro_a")).toBe("pro"); expect(getStripeTierForPriceId("price_old_pro_b")).toBe("pro");
  expect(getStripeTierForPriceId("price_pro_monthly")).toBe("pro");
  expect(getStripeTierForPriceId("price_old_premium")).toBe("premium"); expect(getStripeTierForPriceId("price_premium_yearly")).toBe("premium");
  expect(getStripeTierForPriceId("price_unknown")).toBeNull(); expect(getStripeTierForPriceId("")).toBeNull();
});
it("rejects invalid tiers instead of silently purchasing Premium", async () => {
  expect((await POST(request("pr0"))).status).toBe(400); expect(state.create).not.toHaveBeenCalled();
});
it("does not expose provider errors or internal configuration", async () => {
  state.create.mockRejectedValue(new Error("internal credentials or deployment details"));
  const response = await POST(request("premium")); expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "Checkout is temporarily unavailable." });
});
it.each([null, "revenuecat", "manual"])("does not charge a paid account with unresolved or other-provider ownership: %s", async source => {
  state.tier = "premium"; state.source = source;
  expect((await POST(request("premium"))).status).toBe(409); expect(state.create).not.toHaveBeenCalled();
});
it("does not let a partner-covered free account start its own checkout", async () => {
  state.partnerCovered = true;
  const response = await POST(request("premium"));
  expect(response.status).toBe(409); expect(await response.json()).toEqual({ error: "Premium is already included through your partner's plan." });
  expect(state.create).not.toHaveBeenCalled(); expect(state.initialize).not.toHaveBeenCalled();
});
it("keeps explicit web checkout available for the current Stripe owner", async () => {
  state.tier = "pro"; state.source = "stripe"; state.customer = "cus_existing";
  expect((await POST(request("premium"))).status).toBe(200);
});
it("gives a first-time customer a 7-day trial without pre-binding a Stripe customer", async () => {
  expect((await POST(request("premium"))).status).toBe(200);
  const params = state.create.mock.calls[0][0];
  expect(params.subscription_data.trial_period_days).toBe(7);
  expect(params).not.toHaveProperty("customer");
});
it("does not grant a returning Stripe customer another trial and reuses their customer", async () => {
  state.customer = "cus_existing";
  expect((await POST(request("premium"))).status).toBe(200);
  const params = state.create.mock.calls[0][0];
  expect(params.customer).toBe("cus_existing");
  expect(params.subscription_data).not.toHaveProperty("trial_period_days");
});
it("issues fresh one-use checkout state and binds the provider session before returning its URL", async () => {
  expect((await POST(request("premium"))).status).toBe(200);
  const token = state.create.mock.calls[0][0].metadata.checkoutToken;
  expect(token).toMatch(/^[0-9a-f-]{36}$/);
  expect(state.pending).toMatchObject({ stripePendingCheckoutToken: token, stripePendingCheckoutSessionId: "cs_created" });
  expect(state.create.mock.calls[0][0].subscription_data).toMatchObject({ metadata: { checkoutToken: token, appUserId: "test-user" } });
  expect(state.writes).toHaveLength(2);
  expect(state.writes[0].sql).toContain('"users"."subscription_source"');
  expect(state.writes[1].params).toContain(token);
  await POST(request("premium")); expect(state.create.mock.calls[1][0].metadata.checkoutToken).not.toBe(token);
});
it("does not create a paid session when the atomic reservation fails", async () => {
  state.rejectAtWrite = 1;
  expect((await POST(request("premium"))).status).toBe(409); expect(state.create).not.toHaveBeenCalled();
});
it("does not return a superseded session and expires it when session binding fails", async () => {
  state.rejectAtWrite = 2;
  expect((await POST(request("premium"))).status).toBe(409); expect(state.expire).toHaveBeenCalledWith("cs_created");
});
it("mirrors a trialing Stripe subscription into billingTrialEndsAt", async () => {
  const trialEnd = Date.parse("2026-10-26T00:00:00Z") / 1000;
  expect((await subscriptionEvent("trialing", "price_premium_monthly", trialEnd)).status).toBe(200);
  expect(state.pending).toMatchObject({ subscriptionTier: "premium", subscriptionSource: "stripe", billingTrialEndsAt: new Date(trialEnd * 1000) });
});
it("clears billingTrialEndsAt once a Stripe subscription converts to active", async () => {
  expect((await subscriptionEvent("active")).status).toBe(200);
  expect(state.pending).toMatchObject({ subscriptionTier: "premium", billingTrialEndsAt: null });
});
it("keeps a legacy Pro subscription renewing on its legacy price id", async () => {
  vi.stubEnv("STRIPE_LEGACY_PRO_PRICE_IDS", "price_old_pro");
  expect((await subscriptionEvent("active", "price_old_pro")).status).toBe(200);
  expect(state.pending).toMatchObject({ subscriptionTier: "pro" });
});
it("ignores an unknown Stripe price instead of granting Premium", async () => {
  expect((await subscriptionEvent("active", "price_unknown")).status).toBe(200);
  expect(state.writes).toHaveLength(0); expect(state.pending).toEqual({});
});
