import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Client-side onboarding guard (D-03/D-37 soft navigation).
 * Layouts do not re-render on client navigation, so the server gate only runs
 * on full loads. This component re-checks the live pathname on every
 * navigation: disallowed routes are replaced with /onboarding and the
 * "Continue setup" link follows the live pathname, not the server snapshot.
 */
const nav = vi.hoisted(() => ({ pathname: "/onboarding", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace, push: vi.fn(), refresh: vi.fn() }),
}));
// Static rendering never runs effects; run them synchronously so the test
// observes the navigation side effect.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useEffect: (fn: () => void) => { fn(); } };
});
import { OnboardingGuard } from "@/components/onboarding-guard";

function render(pathname: string) {
  nav.pathname = pathname;
  return renderToStaticMarkup(<OnboardingGuard />);
}

describe("OnboardingGuard", () => {
  beforeEach(() => { nav.replace.mockReset(); });

  it("does nothing on /onboarding and hides the Continue setup link", () => {
    const html = render("/onboarding");
    expect(nav.replace).not.toHaveBeenCalled();
    expect(html).not.toContain("Continue setup");
  });

  it("allows /settings and shows the Continue setup link", () => {
    const html = render("/settings");
    expect(nav.replace).not.toHaveBeenCalled();
    expect(html).toMatch(/href="\/onboarding"[^>]*>Continue setup/);
  });

  it("replaces every other dashboard route with /onboarding after client navigation", () => {
    for (const path of ["/overview", "/daily", "/tasks", "/settingsx"]) {
      nav.replace.mockReset();
      render(path);
      expect(nav.replace).toHaveBeenCalledWith("/onboarding");
    }
  });
});
