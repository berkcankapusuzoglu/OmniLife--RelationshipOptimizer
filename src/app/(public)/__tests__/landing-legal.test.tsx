import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingClient, { yearlySavingsPercent } from "@/app/(public)/landing-client";
import PrivacyPolicyPage from "@/app/(public)/privacy/page";
import TermsOfServicePage from "@/app/(public)/terms/page";
import PublicLayout from "@/app/(public)/layout";
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
const req = vi.hoisted(() => ({ pathname: "/terms" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ back: nav.back, push: nav.push, refresh: vi.fn() }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-pathname": req.pathname }),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" } }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  // Web client render: platform snapshot resolves to "not native" so the pricing section renders.
  return { ...actual, useSyncExternalStore: (_s: unknown, snapshot: () => unknown) => snapshot() };
});

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const PLACEHOLDER = /pending owner verification|operator must|not yet been verified|before the Play launch|verified contact status|databasehosted/i;

beforeEach(() => { vi.stubGlobal("React", React); nav.pathname = "/terms"; req.pathname = "/terms"; nav.back.mockReset(); nav.push.mockReset(); });

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
  it("renders the shared header and footer with a blog link on legal pages", async () => {
    const markup = html(await PublicLayout({ children: <p>body</p> }));
    expect(markup).toContain("<header");
    expect(markup).toContain('href="/blog"');
    expect(markup).toContain("body");
  });
  it("skips the shared header and footer on the landing page", async () => {
    req.pathname = "/";
    const markup = html(await PublicLayout({ children: <p>landing</p> }));
    expect(markup).not.toContain("<header");
    expect(markup).not.toContain("<footer");
    expect(markup).toContain("landing");
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
