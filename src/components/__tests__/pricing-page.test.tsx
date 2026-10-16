import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import PricingPage from "@/app/(public)/pricing/page";

const auth = vi.hoisted(() => ({ user: null as { id: string; subscriptionTier: string } | null, tier: "free" }));
vi.mock("@/lib/auth/guard", () => ({ getCurrentUser: async () => auth.user }));
vi.mock("@/lib/subscription/access", () => ({ getUserTier: async () => auth.tier }));

beforeEach(() => { vi.stubGlobal("React", React); auth.user = null; auth.tier = "free"; });
it("renders public pricing for an anonymous user", async () => {
  const page = await PricingPage();
  expect(page.props.children.props).toMatchObject({ currentTier: "free", userId: undefined });
});
it.each([
  ["premium", "free"], // Expired paid access.
  ["free", "premium"], // Active referral trial.
  ["pro", "pro"],
])("uses effective access %s -> %s for the signed-in account", async (stored, effective) => {
  auth.user = { id: "authenticated-user", subscriptionTier: stored };
  auth.tier = effective;
  const page = await PricingPage();
  expect(page.props.children.props).toMatchObject({ currentTier: effective, userId: "authenticated-user" });
});
