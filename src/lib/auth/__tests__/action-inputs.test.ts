import { describe, expect, it } from "vitest";
import { constraintInput, onboardingInput } from "@/lib/auth/action-inputs";

const base = { type: "redline" as const, dimension: "trust" as const };
const assessment = { vitality: 5, growth: 5, security: 5, connection: 5, emotional: 5, trust: 5, fairness: 5, stress: 5, autonomy: 5 };
const onboarding = { ...assessment, relationshipStatus: "Married", goals: [], scenarioMode: "default", constraints: [] };

describe("constraintInput (D-19)", () => {
  it("accepts a bounded redline", () => {
    expect(constraintInput.safeParse({ ...base, name: "Min trust", minValue: 3, maxValue: 8 }).success).toBe(true);
  });
  it("rejects min/max outside 0-10 and min > max", () => {
    expect(constraintInput.safeParse({ ...base, name: "x", minValue: 99999999 }).success).toBe(false);
    expect(constraintInput.safeParse({ ...base, name: "x", maxValue: -5 }).success).toBe(false);
    expect(constraintInput.safeParse({ ...base, name: "x", minValue: 8, maxValue: 3 }).success).toBe(false);
    expect(constraintInput.safeParse({ ...base, name: "x", minValue: Number.NaN }).success).toBe(false);
  });
  it("caps the name at 60 characters and requires a non-blank name", () => {
    expect(constraintInput.safeParse({ ...base, name: "a".repeat(60) }).success).toBe(true);
    expect(constraintInput.safeParse({ ...base, name: "a".repeat(61) }).success).toBe(false);
    expect(constraintInput.safeParse({ ...base, name: "   " }).success).toBe(false);
  });
});

describe("onboardingInput (D-04)", () => {
  it("accepts an empty or valid partner email", () => {
    expect(onboardingInput.safeParse({ ...onboarding, partnerEmail: "" }).success).toBe(true);
    expect(onboardingInput.safeParse({ ...onboarding, partnerEmail: "partner@example.test" }).success).toBe(true);
    expect(onboardingInput.safeParse(onboarding).success).toBe(true);
  });
  it("rejects an invalid partner email", () => {
    expect(onboardingInput.safeParse({ ...onboarding, partnerEmail: "not-an-email" }).success).toBe(false);
  });
});
