import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingClient, { yearlySavingsPercent } from "@/app/(public)/landing-client";
import PrivacyPolicyPage from "@/app/(public)/privacy/page";
import TermsOfServicePage from "@/app/(public)/terms/page";
import PublicLayout from "@/app/(public)/layout";
import { PublicChrome, CHROME_HIDDEN_PATHS } from "@/components/public-chrome";
import { BackButton, resolveBackNavigation } from "@/components/back-button";
import { TIERS } from "@/lib/subscription/tiers";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/support/contact";

/**
 * QA group landing-legal (2026-10-20 web QA report):
 * D-12/D-57 legal placeholders + contact, D-13/D-33 fabricated social proof,
 * D-30 tiers/savings from TIERS, D-31 back button, D-58 duplicate chrome,
 * D-59 blog link, D-60 logged-out Free card.
 */

const nav = vi.hoisted(() => ({ pathname: "/terms", back: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ back: nav.back, push: nav.push, refresh: vi.fn() }),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" } }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  // Web client render: platform snapshot resolves to "not native" so the pricing section renders.
  return { ...actual, useSyncExternalStore: (_s: unknown, snapshot: () => unknown) => snapshot() };
});

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const PLACEHOLDER = /pending owner verification|operator must|not yet been verified|before the Play launch|verified contact status|databasehosted/i;

beforeEach(() => { vi.stubGlobal("React", React); nav.pathname = "/terms"; nav.back.mockReset(); nav.push.mockReset(); });

describe("landing page honesty (D-13, D-33, D-60)", () => {
  const landing = () => html(<LandingClient />);
  it("has no fabricated counter, live toast or verified badges", () => {
    const markup = landing();
    expect(markup).not.toMatch(/12,8\d\d|couples optimizing|Just now|Sarah|James|Verified|Loved by couples|thousands of couples/);
    expect(markup).not.toContain('aria-label="Dismiss notifications"');
    expect(markup).toContain("not customer reviews");
  });
  it("does not label the Free card as the visitor's current plan", () => {
    expect(landing()).not.toMatch(/Current Plan/i);
  });
  it("links to the blog and legal pages", () => {
    const markup = landing();
    expect(markup).toContain('href="/blog"');
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('href="/terms"');
  });
});

describe("landing pricing from TIERS (D-30)", () => {
  it("computes the yearly savings from the tier prices", () => {
    expect(yearlySavingsPercent(TIERS.premium)).toBe(58);
    expect(yearlySavingsPercent({ monthlyPrice: 10, yearlyPrice: 120 })).toBe(0);
    expect(yearlySavingsPercent(TIERS.free)).toBe(0);
  });
  it("shows only Free and Premium with both prices and the computed badge", () => {
    const markup = html(<LandingClient />);
    expect(markup).toContain(`$${TIERS.premium.monthlyPrice}`);
    expect(markup).toContain(`$${TIERS.premium.yearlyPrice}/year`);
    expect(markup).toContain("Save 58%");
    expect(markup).not.toContain("Save 37%");
    expect(markup).not.toContain(TIERS.pro.name);
    expect(markup).not.toContain(`$${TIERS.pro.monthlyPrice}`);
  });
});

describe("legal pages (D-12, D-57)", () => {
  it("privacy publishes the contact and no operator placeholders", () => {
    const markup = html(<PrivacyPolicyPage />);
    expect(markup).toContain(`mailto:${SUPPORT_CONTACT_EMAIL}`);
    expect(markup).not.toMatch(PLACEHOLDER);
    expect(markup).toContain("database</strong> hosted on Supabase");
    expect(markup).not.toMatch(/logs in development/);
  });
  it("terms publishes the contact and no operator placeholders", () => {
    const markup = html(<TermsOfServicePage />);
    expect(markup).toContain(`mailto:${SUPPORT_CONTACT_EMAIL}`);
    expect(markup).not.toMatch(PLACEHOLDER);
  });
});

describe("public layout chrome (D-58, D-59)", () => {
  // The chrome decision lives in a client component driven by usePathname(),
  // never in the shared server layout: a layout shared by sibling routes is
  // not re-rendered on soft navigation, so a request-header branch there
  // would leave / with duplicate chrome or /privacy with none.
  it("renders the shared header and footer with a blog link on legal pages", () => {
    const markup = html(<PublicChrome><p>body</p></PublicChrome>);
    expect(markup).toContain("<header");
    expect(markup).toContain("<footer");
    expect(markup).toContain('href="/blog"');
    expect(markup).toContain("body");
  });
  it.each(["/privacy", "/blog", "/pricing", "/blog/some-post"])("renders chrome on %s", (pathname) => {
    nav.pathname = pathname;
    const markup = html(<PublicChrome><p>body</p></PublicChrome>);
    expect(markup).toContain("<header");
    expect(markup).toContain("<footer");
  });
  // /quiz owns its chrome: it is a 100dvh step flow with a sticky bottom CTA, and
  // the shared header + footer pushed "Next" below the fold (tester feedback 2026-10-23).
  it("skips the shared header and footer on the quiz so each step fits one screen", () => {
    nav.pathname = "/quiz";
    const markup = html(<PublicChrome><p>quiz</p></PublicChrome>);
    expect(markup).not.toContain("<header");
    expect(markup).not.toContain("<footer");
    expect(CHROME_HIDDEN_PATHS.has("/quiz")).toBe(true);
  });
  it("skips the shared header and footer on the landing page", () => {
    nav.pathname = "/";
    const markup = html(<PublicChrome><p>landing</p></PublicChrome>);
    expect(markup).not.toContain("<header");
    expect(markup).not.toContain("<footer");
    expect(markup).toContain("landing");
    expect(CHROME_HIDDEN_PATHS.has("/")).toBe(true);
  });
  it("layout delegates to the client chrome instead of reading request headers", () => {
    nav.pathname = "/";
    expect(html(PublicLayout({ children: <p>landing</p> }))).not.toContain("<header");
    nav.pathname = "/terms";
    expect(html(PublicLayout({ children: <p>legal</p> }))).toContain("<header");
  });
});

describe("back button (D-31)", () => {
  it("is hidden on the landing page", () => {
    nav.pathname = "/";
    expect(html(<BackButton />)).toBe("");
  });
  it("renders on other public pages", () => {
    expect(html(<BackButton />)).toContain("Back");
  });
  it("falls back to / when the tab has no history", () => {
    expect(resolveBackNavigation(1)).toEqual({ kind: "push", href: "/" });
    expect(resolveBackNavigation(0)).toEqual({ kind: "push", href: "/" });
    expect(resolveBackNavigation(2)).toEqual({ kind: "back" });
  });
});
