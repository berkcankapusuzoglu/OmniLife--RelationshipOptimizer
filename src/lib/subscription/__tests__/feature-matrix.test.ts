import { describe, expect, it, vi } from "vitest";
import { TIERS, SELLABLE_TIERS, type Features } from "@/lib/subscription/tiers";
import { canAccess } from "@/lib/subscription/access";
import { hasFeatureAccess } from "@/lib/auth/tier-gate";

const state = vi.hoisted(() => ({ tier: "free" as string }));
vi.mock("@/lib/subscription/access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/subscription/access")>()),
  getUserTier: async () => state.tier,
  getEntitlement: async () => ({ tier: state.tier, via: "none", expiresAt: null, source: null, ownerId: "user-test" }),
}));

const FEATURE_KEYS: Array<keyof Features> = [
  "dailyLog", "basicScores", "exerciseLimit", "historyDays", "compareDays", "insights", "weeklyCheckin",
  "scenarios", "constraints", "partnerLinking", "exportReports", "aiCoaching", "aiDailyMessageQuota", "therapistExport",
];

describe("feature matrix", () => {
  it("matches the v1.1.0 locked product decisions", () => {
    expect(TIERS).toMatchSnapshot();
  });
  it("defines every feature key for every tier", () => {
    for (const tier of Object.values(TIERS)) for (const key of FEATURE_KEYS) expect(tier.features).toHaveProperty(key);
  });
  it("sells Premium only", () => {
    expect(SELLABLE_TIERS).toEqual(["premium"]);
    expect(TIERS.premium.monthlyPrice).toBe(4.99);
    expect(TIERS.premium.yearlyPrice).toBe(24.99);
    expect(TIERS.premium.featureList[0]).toBe("Covers both partners");
  });
  it("limits the free tier", () => {
    expect(TIERS.free.features).toMatchObject({ exerciseLimit: 5, historyDays: 7, compareDays: 7, insights: false, scenarios: false, constraints: false, exportReports: false, aiCoaching: false, aiDailyMessageQuota: 0 });
    expect(TIERS.free.featureList).toEqual(["Daily check-in & scores", "Streaks", "7-day history", "5 exercises per week", "Partner linking"]);
  });
  it("gives Premium everything with a 30-message coaching quota", () => {
    expect(TIERS.premium.features).toMatchObject({ exerciseLimit: Infinity, historyDays: 90, compareDays: 30, insights: true, scenarios: true, constraints: true, exportReports: true, aiCoaching: true, aiDailyMessageQuota: 30, therapistExport: true });
  });
  it("keeps legacy Pro readable but without AI quota", () => {
    expect(TIERS.pro.monthlyPrice).toBe(3.99);
    expect(TIERS.pro.features).toMatchObject({ compareDays: 30, aiDailyMessageQuota: 0, aiCoaching: false, insights: true });
  });
  it("canAccess refuses premium features on free", () => {
    expect(canAccess("free", "scenarios")).toBe(false);
    expect(canAccess("free", "aiDailyMessageQuota")).toBe(false);
    expect(canAccess("free", "dailyLog")).toBe(true);
    expect(canAccess("premium", "scenarios")).toBe(true);
  });
  it("names premium (never pro) as the required tier", async () => {
    state.tier = "free";
    for (const feature of ["insights", "scenarios", "constraints", "exportReports", "aiCoaching", "therapistExport", "aiDailyMessageQuota"] as const) {
      expect(await hasFeatureAccess("user-test", feature)).toEqual({ allowed: false, requiredTier: "premium" });
    }
    expect(await hasFeatureAccess("user-test", "dailyLog")).toEqual({ allowed: true, requiredTier: "free" });
  });
  it("honours inherited and legacy tiers in hasFeatureAccess", async () => {
    state.tier = "premium";
    expect((await hasFeatureAccess("user-test", "aiCoaching")).allowed).toBe(true);
    state.tier = "pro";
    expect((await hasFeatureAccess("user-test", "insights")).allowed).toBe(true);
    expect(await hasFeatureAccess("user-test", "aiCoaching")).toEqual({ allowed: false, requiredTier: "premium" });
  });
});
