import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/stripe/checkout/route";
import { getStripePriceId } from "@/lib/stripe/config";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const state = vi.hoisted(() => ({ loggedIn: true, tier: "free", source: null as string | null, create: vi.fn(), initialize: vi.fn(), expire: vi.fn(), pending: {} as Record<string, unknown>, writes: [] as Array<{ sql: string; params: unknown[] }>, rejectAtWrite: 0 }));
vi.mock("@/lib/auth/guard", () => ({ getCurrentUser: async () => state.loggedIn ? { id: "test-user", subscriptionTier: state.tier, subscriptionSource: state.source } : null }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => { state.initialize(); return { checkout: { sessions: { create: state.create, expire: state.expire } } }; } }));
vi.mock("@/lib/db", () => ({ getDb: () => ({ update: () => ({ set: (values: Record<string, unknown>) => ({ where: (predicate: SQL) => ({ returning: async () => {
  state.writes.push(new PgDialect().sqlToQuery(predicate));
  if (state.writes.length === state.rejectAtWrite) return [];
  Object.assign(state.pending, values); return [{ id: "test-user" }];
} }) }) }) }) }));
function request(tier: unknown = "pro", priceType = "monthly") { return new NextRequest("https://example.test/api/stripe/checkout", { method: "POST", headers: { origin: "https://example.test" }, body: JSON.stringify({ tier, priceType }) }); }
beforeEach(() => {
  state.loggedIn = true; state.tier = "free"; state.source = null; state.create.mockReset().mockResolvedValue({ id: "cs_created", url: "https://checkout.example.test" }); state.initialize.mockClear();
  state.expire.mockReset().mockResolvedValue({}); state.pending = {}; state.writes = []; state.rejectAtWrite = 0;
  for (const name of ["STRIPE_PRO_MONTHLY_PRICE_ID", "STRIPE_PRO_YEARLY_PRICE_ID", "STRIPE_MONTHLY_PRICE_ID", "STRIPE_YEARLY_PRICE_ID"]) vi.stubEnv(name, "");
  vi.stubEnv("STRIPE_MONTHLY_PRICE_ID", "price_premium_monthly"); vi.stubEnv("STRIPE_YEARLY_PRICE_ID", "price_premium_yearly");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it("authenticates before inspecting or disclosing billing configuration", async () => {
  state.loggedIn = false; const response = await POST(request());
  expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: "Unauthorized" }); expect(state.initialize).not.toHaveBeenCalled();
});
it.each(["monthly", "yearly"])("does not charge Premium when the Pro %s price is missing", async interval => {
  expect(() => getStripePriceId(interval as "monthly" | "yearly", "pro")).toThrow();
  const response = await POST(request("pro", interval));
  expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "Checkout is temporarily unavailable." }); expect(state.initialize).not.toHaveBeenCalled();
});
it("rejects a Pro price aliased to a Premium price", async () => {
  vi.stubEnv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_premium_monthly");
  const response = await POST(request()); expect(response.status).toBe(503); expect(state.create).not.toHaveBeenCalled();
});
it.each(["pro", "premium"])("uses the configured %s price with matching metadata", async tier => {
  vi.stubEnv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_pro_monthly");
  expect((await POST(request(tier))).status).toBe(200);
  expect(state.create.mock.calls[0][0]).toMatchObject({ line_items: [{ price: tier === "pro" ? "price_pro_monthly" : "price_premium_monthly", quantity: 1 }], metadata: { tier }, client_reference_id: "test-user" });
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
it("keeps explicit web checkout available for the current Stripe owner", async () => {
  state.tier = "pro"; state.source = "stripe";
  expect((await POST(request("premium"))).status).toBe(200);
});
it("issues fresh one-use checkout state and binds the provider session before returning its URL", async () => {
  expect((await POST(request("premium"))).status).toBe(200);
  const token = state.create.mock.calls[0][0].metadata.checkoutToken;
  expect(token).toMatch(/^[0-9a-f-]{36}$/);
  expect(state.pending).toMatchObject({ stripePendingCheckoutToken: token, stripePendingCheckoutSessionId: "cs_created" });
  expect(state.create.mock.calls[0][0].subscription_data).toEqual({ metadata: { checkoutToken: token, appUserId: "test-user" } });
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
