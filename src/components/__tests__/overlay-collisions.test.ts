import { describe, expect, it } from "vitest";
import { isConsentSuppressed } from "@/components/cookie-consent";

/**
 * Tester feedback 2026-10-23: the quiz CTA could not be tapped. The floating
 * cookie notice is fixed to the bottom of the viewport, which is exactly where
 * the step flows pin "Start Quiz" / "Next", so it sat on top of the primary
 * action and swallowed the taps.
 */
describe("cookie notice placement", () => {
  it.each(["/quiz", "/quiz/result", "/onboarding"])(
    "stays out of the way on the focused step flow %s",
    (pathname) => {
      expect(isConsentSuppressed(pathname)).toBe(true);
    }
  );

  it.each(["/", "/pricing", "/privacy", "/overview", "/blog/some-post"])(
    "still shows on the ordinary page %s",
    (pathname) => {
      expect(isConsentSuppressed(pathname)).toBe(false);
    }
  );

  it("does not treat a lookalike prefix as a step flow", () => {
    expect(isConsentSuppressed("/quizzes")).toBe(false);
    expect(isConsentSuppressed("/onboarding-guide")).toBe(false);
  });
});
