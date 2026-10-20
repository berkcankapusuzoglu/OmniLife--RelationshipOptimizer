import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Dashboard layout onboarding gate (D-02, D-03, D-37).
 * While onboarding is pending: no sidebar, no bottom nav, no welcome modal;
 * only /onboarding and /settings render; everything else redirects to
 * /onboarding; a missing x-pathname never redirects (no loop).
 */
const state = vi.hoisted(() => ({
  user: { id: "u1", name: "QA", email: "qa@example.test", onboardingCompleted: false, activeScenarioId: null as string | null, currentStreak: 0 },
  pathname: null as string | null,
}));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => state.user }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (k: string) => (k === "x-pathname" ? state.pathname : null) }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`Redirect:${url}`); } }));
vi.mock("@/lib/db", () => ({ getDb: () => ({ select: () => ({ from: () => ({ where: () => Promise.resolve([{ value: 0 }]) }) }) }) }));
vi.mock("@/components/nav/SidebarNav", () => ({ SidebarNav: () => <nav data-testid="sidebar-nav" /> }));
vi.mock("@/components/nav/MobileNav", () => ({ MobileNav: () => <nav data-testid="mobile-nav" /> }));
vi.mock("@/components/welcome-modal", () => ({ WelcomeModal: () => <div data-testid="welcome-modal" /> }));
vi.mock("@/components/streak-badge", () => ({ StreakBadge: () => <span /> }));
vi.mock("@/components/revenuecat-init", () => ({ RevenueCatInit: () => null }));
vi.mock("@/lib/billing/flags", () => ({ nativeBillingEnabled: () => false }));
vi.mock("@/components/onboarding-guard", () => ({ OnboardingGuard: () => <span data-testid="onboarding-guard" /> }));
import DashboardLayout from "@/app/(dashboard)/layout";

async function render(pathname: string | null) {
  state.pathname = pathname;
  return renderToStaticMarkup(await DashboardLayout({ children: <p>page body</p> }));
}

describe("dashboard layout onboarding gate", () => {
  beforeEach(() => { state.user.onboardingCompleted = false; });

  it("renders /onboarding without any navigation while onboarding is pending", async () => {
    const html = await render("/onboarding");
    expect(html).toContain("page body");
    expect(html).not.toContain("sidebar-nav");
    expect(html).not.toContain("mobile-nav");
    expect(html).not.toContain("welcome-modal");
    expect(html).toContain("onboarding-guard");
  });

  it("keeps /settings reachable during onboarding and mounts the client guard", async () => {
    const html = await render("/settings");
    expect(html).toContain("page body");
    expect(html).not.toContain("mobile-nav");
    // The "Continue setup" link and soft-navigation redirect live in the client
    // guard (see onboarding-guard.test.tsx), which reads the live pathname.
    expect(html).toContain("onboarding-guard");
  });

  it("redirects every other dashboard route to /onboarding", async () => {
    for (const path of ["/overview", "/daily", "/tasks"]) {
      await expect(render(path)).rejects.toThrow("Redirect:/onboarding");
    }
  });

  it("never redirects when x-pathname is missing (no redirect loop)", async () => {
    const html = await render(null);
    expect(html).toContain("page body");
    expect(html).not.toContain("mobile-nav");
    // The client guard still enforces the route from the live pathname.
    expect(html).toContain("onboarding-guard");
  });

  it("renders the full chrome once onboarding is complete", async () => {
    state.user.onboardingCompleted = true;
    const html = await render("/overview");
    expect(html).toContain("sidebar-nav");
    expect(html).toContain("mobile-nav");
    expect(html).toContain("welcome-modal");
    expect(html).not.toContain("onboarding-guard");
  });
});
