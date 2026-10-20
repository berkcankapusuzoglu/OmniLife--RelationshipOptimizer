import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ inserts: [] as unknown[], revalidate: vi.fn(), updateStreak: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => ({ id: "11111111-1111-4111-8111-111111111111" }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`Redirect:${url}`); } }));
vi.mock("@/lib/streaks", () => ({ updateStreak: mocks.updateStreak }));
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    insert: () => ({ values: async (row: unknown) => { mocks.inserts.push(row); } }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
  }),
}));

import { completeOnboarding, type OnboardingData } from "@/app/(dashboard)/onboarding/actions";
import { OnboardingClient, ONBOARDING_DRAFT_KEY } from "@/app/(dashboard)/onboarding/onboarding-client";

const valid: OnboardingData = {
  relationshipStatus: "Married", goals: ["Build trust"],
  vitality: 5, growth: 5, security: 5, connection: 5, emotional: 5, trust: 5, fairness: 5, stress: 5, autonomy: 5,
  scenarioMode: "default", constraints: [], partnerEmail: "",
};

describe("completeOnboarding (D-04)", () => {
  beforeEach(() => { mocks.inserts = []; mocks.revalidate.mockClear(); mocks.updateStreak.mockClear(); });
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
