import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import PricingPage from "@/app/(public)/pricing/page";

const auth = vi.hoisted(() => ({ user: null as { id: string; subscriptionTier: string } | null, tier: "free", via: "none" }));
vi.mock("@/lib/auth/guard", () => ({ getCurrentUser: async () => auth.user }));
vi.mock("@/lib/revenuecat/sync", () => ({ syncRevenueCatEntitlement: vi.fn() }));
vi.mock("@/lib/subscription/access", () => ({
  getUserTier: async () => auth.tier,
  getEntitlement: async (id: string) => ({ tier: auth.tier, via: auth.via, expiresAt: null, source: auth.via === "own" ? "stripe" : null, ownerId: auth.via === "partner" ? "partner-user" : id }),
}));

beforeEach(() => { vi.stubGlobal("React", React); auth.user = null; auth.tier = "free"; auth.via = "none"; vi.stubEnv("NATIVE_BILLING_ENABLED", ""); });
it("renders public pricing for an anonymous user", async () => {
  const page = await PricingPage({ searchParams: Promise.resolve({}) });
  expect(page.props.children.props).toMatchObject({ currentTier: "free", userId: undefined, nativeBilling: false, entitlement: null });
});
it("passes the server billing flag and the effective entitlement as plain data", async () => {
  vi.stubEnv("NATIVE_BILLING_ENABLED", "true");
  auth.user = { id: "authenticated-user", subscriptionTier: "free" }; auth.tier = "premium"; auth.via = "partner";
  const page = await PricingPage({ searchParams: Promise.resolve({}) });
  expect(page.props.children.props).toMatchObject({ currentTier: "premium", nativeBilling: true, entitlement: { tier: "premium", via: "partner", source: null, ownerId: "partner-user" } });
  expect(JSON.parse(JSON.stringify(page.props.children.props.entitlement))).toEqual(page.props.children.props.entitlement);
});
it.each([
  ["premium", "free"], // Expired paid access.
  ["free", "premium"], // Active referral trial.
  ["pro", "pro"],
])("uses effective access %s -> %s for the signed-in account", async (stored, effective) => {
  auth.user = { id: "authenticated-user", subscriptionTier: stored };
  auth.tier = effective;
  const page = await PricingPage({ searchParams: Promise.resolve({}) });
  expect(page.props.children.props).toMatchObject({ currentTier: effective, userId: "authenticated-user" });
});
