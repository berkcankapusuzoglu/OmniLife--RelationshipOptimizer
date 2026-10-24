import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tester feedback 2026-10-23: "Not keeping logged in."
 *
 * The landing page is the native app's start URL, so a signed-in user who
 * reopens the app lands here. It used to read the pre-migration unsigned
 * `session` cookie, which no longer exists after the HMAC session migration
 * (`session_token`), so the redirect never fired and every launch showed the
 * marketing page with "Log in" / "Get Started" — indistinguishable from being
 * logged out. These tests pin the page to the real session reader.
 */

const state: { session: { userId: string } | null } = { session: null };

vi.mock("@/lib/auth/session", () => ({
  getSession: async () => state.session,
}));

class RedirectError extends Error {
  constructor(public target: string) {
    super(`NEXT_REDIRECT:${target}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (target: string) => {
    throw new RedirectError(target);
  },
}));

vi.mock("@/app/(public)/landing-client", () => ({
  default: () => null,
}));

const { default: PublicLandingPage } = await import("@/app/(public)/page");

async function redirectTargetOf(): Promise<string | null> {
  try {
    await PublicLandingPage();
    return null;
  } catch (err) {
    if (err instanceof RedirectError) return err.target;
    throw err;
  }
}

describe("public landing page session handling", () => {
  beforeEach(() => {
    state.session = null;
  });

  it("sends a signed-in visitor to the dashboard instead of the marketing page", async () => {
    state.session = { userId: "user-1" };
    expect(await redirectTargetOf()).toBe("/overview");
  });

  it("renders the marketing page for an anonymous visitor", async () => {
    expect(await redirectTargetOf()).toBeNull();
  });

  it("does not depend on the removed unsigned `session` cookie", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/app/(public)/page.tsx", "utf8")
    );
    expect(source).toContain("getSession");
    expect(source).not.toMatch(/cookieStore\.get\(\s*["']session["']\s*\)/);
    expect(source).not.toContain('Buffer.from(session.value, "base64")');
  });
});
