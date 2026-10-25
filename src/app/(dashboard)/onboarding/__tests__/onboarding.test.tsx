import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ inserts: [] as unknown[], updates: [] as unknown[], revalidate: vi.fn(), updateStreak: vi.fn(), onboardingCompleted: false }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => ({ id: "11111111-1111-4111-8111-111111111111", onboardingCompleted: mocks.onboardingCompleted }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`Redirect:${url}`); } }));
vi.mock("@/lib/streaks", () => ({ updateStreak: mocks.updateStreak }));
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    insert: () => ({ values: async (row: unknown) => { mocks.inserts.push(row); } }),
    update: () => ({ set: (row: unknown) => { mocks.updates.push(row); return { where: async () => undefined }; } }),
  }),
}));

import { completeOnboarding, skipOnboarding, type OnboardingData } from "@/app/(dashboard)/onboarding/actions";
import {
  NEUTRAL_DIMENSION_SCORE,
  resolveSkipAssessment,
  resolveSkipScenarioMode,
} from "@/app/(dashboard)/onboarding/skip";
import { OnboardingClient, ONBOARDING_DRAFT_KEY } from "@/app/(dashboard)/onboarding/onboarding-client";

const valid: OnboardingData = {
  relationshipStatus: "Married", goals: ["Build trust"],
  vitality: 5, growth: 5, security: 5, connection: 5, emotional: 5, trust: 5, fairness: 5, stress: 5, autonomy: 5,
  scenarioMode: "default", constraints: [], partnerEmail: "",
};

describe("completeOnboarding (D-04)", () => {
  beforeEach(() => { mocks.inserts = []; mocks.updates = []; mocks.revalidate.mockClear(); mocks.updateStreak.mockClear(); });
  it("returns an error instead of throwing on an invalid partner email and writes nothing", async () => {
    const result = await completeOnboarding({ ...valid, partnerEmail: "not-an-email" });
    expect(result).toEqual({ error: expect.stringMatching(/email/i) });
    expect(mocks.inserts).toHaveLength(0);
  });
  it("returns an error for out-of-range constraints", async () => {
    const result = await completeOnboarding({ ...valid, constraints: [{ name: "x", type: "redline", dimension: "trust", minValue: 99999999 }] });
    expect(result).toHaveProperty("error");
    expect(mocks.inserts).toHaveLength(0);
  });
  it("redirects to /overview after a valid submission", async () => {
    await expect(completeOnboarding(valid)).rejects.toThrow("Redirect:/overview");
    expect(mocks.inserts.length).toBeGreaterThan(0);
    expect(mocks.updateStreak).toHaveBeenCalled();
  });
});

const presets = [{ id: "p1", name: "Default", mode: "default", description: "Balanced" }];

describe("OnboardingClient accessibility and layout (D-16, D-18, D-48)", () => {
  it("marks status and goal chips with aria-pressed", () => {
    const html = renderToStaticMarkup(<OnboardingClient scenarioPresets={presets} />);
    expect(html.match(/aria-pressed="false"/g)?.length).toBe(16);
  });
  it("gives every self-assessment slider an accessible name", () => {
    const html = renderToStaticMarkup(<OnboardingClient scenarioPresets={presets} initialStep={1} />);
    for (const label of ["Vitality", "Growth", "Security", "Connection", "Emotional", "Trust", "Fairness", "Stress Level", "Personal Space"]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });
  it("gives scenario option buttons aria-pressed", () => {
    const html = renderToStaticMarkup(<OnboardingClient scenarioPresets={presets} initialStep={2} />);
    expect(html).toContain('aria-pressed="true"');
  });
  it("labels constraint selects and bounds constraint inputs", () => {
    const html = renderToStaticMarkup(<OnboardingClient scenarioPresets={presets} initialStep={3} initialShowConstraintForm />);
    expect(html).toContain('aria-label="Constraint type"');
    expect(html).toContain('aria-label="Constraint dimension"');
    expect(html).toMatch(/id="constraint-name"[^>]*maxLength="60"/);
    expect(html.match(/type="number"[^>]*min="0" max="10" step="1"/g)?.length).toBe(2);
  });
  it("labels the partner email input and pads the bottom for the fixed nav", () => {
    const html = renderToStaticMarkup(<OnboardingClient scenarioPresets={presets} initialStep={4} />);
    expect(html).toContain('id="partner-email"');
    expect(html).toContain('for="partner-email"');
    expect(html).toContain("safe-area-inset-bottom");
  });
  it("exports a stable draft storage key", () => {
    expect(ONBOARDING_DRAFT_KEY).toBe("onboardingDraft");
  });
});

describe("onboarding skip derivation (D-49)", () => {
  it("keeps an existing quiz prefill instead of resetting it to neutral", () => {
    const resolved = resolveSkipAssessment({ emotional: 8, trust: 3, stress: 7 });
    expect(resolved.emotional).toBe(8);
    expect(resolved.trust).toBe(3);
    expect(resolved.stress).toBe(7);
  });
  it("leaves every unanswered dimension at the neutral default", () => {
    const resolved = resolveSkipAssessment({ emotional: 8 });
    expect(NEUTRAL_DIMENSION_SCORE).toBe(5);
    for (const key of ["vitality", "growth", "security", "connection", "trust", "fairness", "stress", "autonomy"] as const) {
      expect(resolved[key]).toBe(NEUTRAL_DIMENSION_SCORE);
    }
  });
  it("falls back to neutral for values it cannot trust", () => {
    const resolved = resolveSkipAssessment({ vitality: 0, growth: 11, security: 4.5, connection: Number.NaN, trust: "8" });
    expect(resolved.vitality).toBe(NEUTRAL_DIMENSION_SCORE);
    expect(resolved.growth).toBe(NEUTRAL_DIMENSION_SCORE);
    expect(resolved.security).toBe(NEUTRAL_DIMENSION_SCORE);
    expect(resolved.connection).toBe(NEUTRAL_DIMENSION_SCORE);
    expect(resolved.trust).toBe(NEUTRAL_DIMENSION_SCORE);
  });
  it("resolves a missing or unknown scenario to the default preset", () => {
    expect(resolveSkipScenarioMode("exam")).toBe("exam");
    expect(resolveSkipScenarioMode(undefined)).toBe("default");
    expect(resolveSkipScenarioMode("not-a-mode")).toBe("default");
  });
});

describe("skipOnboarding (D-49)", () => {
  beforeEach(() => { mocks.inserts = []; mocks.updates = []; mocks.revalidate.mockClear(); mocks.updateStreak.mockClear(); });
  it("marks onboarding complete and redirects, so the dashboard gate cannot bounce the user back", async () => {
    await expect(skipOnboarding({ dimensionScores: { emotional: 8 } })).rejects.toThrow("Redirect:/overview");
    expect(mocks.updates).toHaveLength(1);
    expect(mocks.updates[0]).toMatchObject({ onboardingCompleted: true });
  });
  it("writes the first log from the prefilled assessment", async () => {
    await expect(skipOnboarding({ dimensionScores: { emotional: 8 } })).rejects.toThrow("Redirect:/overview");
    const log = mocks.inserts.find((row) => !!(row as { emotionalScore?: number }).emotionalScore) as Record<string, unknown>;
    expect(log.emotionalScore).toBe(8);
    expect(log.vitalityScore).toBe(NEUTRAL_DIMENSION_SCORE);
    expect(mocks.updateStreak).toHaveBeenCalled();
  });
  it("writes nothing when onboarding is already complete, so a replayed call cannot double the first log", async () => {
    mocks.onboardingCompleted = true;
    try {
      await expect(skipOnboarding({})).rejects.toThrow("Redirect:/overview");
      await expect(completeOnboarding(valid)).rejects.toThrow("Redirect:/overview");
    } finally {
      mocks.onboardingCompleted = false;
    }
    expect(mocks.inserts).toHaveLength(0);
    expect(mocks.updateStreak).not.toHaveBeenCalled();
  });
  it("accepts a skip with nothing answered at all", async () => {
    await expect(skipOnboarding({})).rejects.toThrow("Redirect:/overview");
    expect(mocks.inserts.length).toBeGreaterThan(0);
  });
});

describe("OnboardingClient skip affordance (D-49)", () => {
  it("offers a skip on the first step without competing with Next", () => {
    const html = renderToStaticMarkup(<OnboardingClient scenarioPresets={presets} />);
    expect(html).toContain("Skip for now");
    expect(html.match(/aria-pressed="false"/g)?.length).toBe(16);
  });
  it("still offers a skip on the last step", () => {
    const html = renderToStaticMarkup(<OnboardingClient scenarioPresets={presets} initialStep={4} />);
    expect(html).toContain("Skip for now");
  });
});
