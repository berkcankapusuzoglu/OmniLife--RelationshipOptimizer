import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { createSession, getSession } from "@/lib/auth/session";
import { POST as checkout } from "@/app/api/stripe/checkout/route";
import { POST as portal } from "@/app/api/stripe/portal/route";

const state = vi.hoisted(() => ({ cookie: undefined as string | undefined, users: [] as Array<{ id: string; stripeCustomerId: string | null }>, providerCalls: [] as string[], checkoutReferences: [] as string[] }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: () => state.cookie ? { value: state.cookie } : undefined,
  set: (_name: string, value: string) => { state.cookie = value; },
  delete: () => { state.cookie = undefined; },
}) }));
vi.mock("@/lib/db", () => ({ getDb: () => ({ select: () => ({ from: () => ({ where: (predicate: SQL) => ({ limit: async () => {
  const query = new PgDialect().sqlToQuery(predicate);
  if (query.sql !== '"users"."id" = $1') throw new Error("Expected a user identity predicate");
  return state.users.filter((user) => user.id === query.params[0]);
} }) }) }) }) }));
vi.mock("@/lib/stripe/config", () => ({ getStripePriceId: () => "price-test", getAppUrl: () => "https://example.test" }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => {
  state.providerCalls.push("initialize");
  return {
    checkout: { sessions: { create: async (input: { client_reference_id: string }) => { state.providerCalls.push("checkout"); state.checkoutReferences.push(input.client_reference_id); return { url: "https://billing.example.test/checkout" }; } } },
    billingPortal: { sessions: { create: async () => { state.providerCalls.push("portal"); return { url: "https://billing.example.test/portal" }; } } },
  };
} }));

const accountId = "00000000-0000-4000-8000-000000000001";
function request() {
  return new NextRequest("https://example.test/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json", origin: "https://example.test" }, body: JSON.stringify({ priceType: "monthly", tier: "premium" }) });
}

describe("billing rejects deleted-account session replay", () => {
  beforeEach(() => {
    state.cookie = undefined; state.users = [{ id: accountId, stripeCustomerId: "cus-test" }]; state.providerCalls = []; state.checkoutReferences = [];
    vi.stubEnv("SESSION_SECRET", "test-only-billing-replay-key-at-least-32-bytes");
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("rejects a still-valid signed deleted-account cookie before any Stripe call", async () => {
    await createSession(accountId);
    state.users = [];
    expect(await getSession()).toEqual({ userId: accountId });
    const response = await checkout(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(state.providerCalls).toEqual([]);
    expect(state.checkoutReferences).toEqual([]);
  });
  it("keeps checkout available to a current database account", async () => {
    await createSession(accountId);
    const response = await checkout(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://billing.example.test/checkout" });
    expect(state.checkoutReferences).toEqual([accountId]);
  });
  it("rejects missing cookies before any Stripe call", async () => {
    const response = await checkout(request());
    expect(response.status).toBe(401);
    expect(state.providerCalls).toEqual([]);
  });
  it("the existing portal account lookup also rejects replay without reaching Stripe", async () => {
    await createSession(accountId);
    state.users = [];
    const response = await portal();
    expect(response.status).toBe(400);
    expect(state.providerCalls).toEqual([]);
  });
});
