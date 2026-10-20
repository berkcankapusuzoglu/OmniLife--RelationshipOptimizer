import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import DeleteAccountPage from "@/app/(public)/delete-account/page";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/support/contact";

vi.mock("@/lib/auth/guard", () => ({ getCurrentUser: async () => null }));
vi.mock("@/app/(public)/delete-account/delete-account-client", () => ({ DeleteAccountClient: () => null }));

describe("public account deletion contact", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  async function page() {
    vi.stubGlobal("React", React);
    return renderToStaticMarkup(await DeleteAccountPage({ searchParams: Promise.resolve({}) }));
  }
  it("publishes the monitored deletion contact regardless of legacy env flags", async () => {
    vi.stubEnv("ACCOUNT_DELETION_CONTACT_EMAIL", "stale@example.test");
    vi.stubEnv("ACCOUNT_DELETION_CONTACT_VERIFIED", "false");
    const html = await page();
    expect(html).toContain(`href="mailto:${SUPPORT_CONTACT_EMAIL}?subject=Couplemetric%20account%20deletion"`);
    expect(html).not.toContain("stale@example.test");
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/forgot-password"');
  });
  it("ships no operator placeholder copy", async () => {
    const html = await page();
    expect(html).not.toMatch(/pending owner verification|operator|not yet been verified|before the Play launch/i);
  });
});
