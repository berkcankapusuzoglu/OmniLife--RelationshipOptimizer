import { describe, expect, it } from "vitest";
import {
  isOnboardingAllowedPath,
  postAuthDestination,
  resolveOnboardingGate,
} from "@/lib/auth/onboarding-gate";

describe("onboarding gate (D-02, D-03, D-37)", () => {
  it("opens the full dashboard once onboarding is complete, whatever the path", () => {
    expect(resolveOnboardingGate(true, "/overview")).toBe("open");
    expect(resolveOnboardingGate(true, "/onboarding")).toBe("open");
    expect(resolveOnboardingGate(true, null)).toBe("open");
  });

  it("allows /onboarding and /settings (account deletion) while pending", () => {
    expect(resolveOnboardingGate(false, "/onboarding")).toBe("allow");
    expect(resolveOnboardingGate(false, "/settings")).toBe("allow");
    expect(resolveOnboardingGate(false, "/settings/export-pdf")).toBe("allow");
  });

  it("redirects every other dashboard route while pending", () => {
    for (const path of ["/overview", "/daily", "/tasks", "/insights", "/settingsx", "/onboardingx"]) {
      expect(resolveOnboardingGate(false, path)).toBe("redirect");
    }
    expect(isOnboardingAllowedPath("/overview")).toBe(false);
  });

  it("never redirects when the pathname is unknown, so /onboarding cannot loop", () => {
    expect(resolveOnboardingGate(false, null)).toBe("allow");
    expect(resolveOnboardingGate(false, undefined)).toBe("allow");
    expect(resolveOnboardingGate(false, "")).toBe("allow");
  });

  it("sends new or unfinished users straight to /onboarding after auth", () => {
    expect(postAuthDestination(false)).toBe("/onboarding");
    expect(postAuthDestination(true)).toBe("/overview");
  });
});
