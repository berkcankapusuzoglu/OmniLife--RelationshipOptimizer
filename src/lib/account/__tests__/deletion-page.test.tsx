import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import DeleteAccountPage from "@/app/(public)/delete-account/page";

vi.mock("@/lib/auth/guard", () => ({ getCurrentUser: async () => null }));
vi.mock("@/app/(public)/delete-account/delete-account-client", () => ({ DeleteAccountClient: () => null }));

describe("public account deletion contact", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  async function page() {
    vi.stubGlobal("React", React);
    return renderToStaticMarkup(await DeleteAccountPage({ searchParams: Promise.resolve({}) }));
  }
  it("does not advertise a configured contact until the owner verifies it", async () => {
    vi.stubEnv("ACCOUNT_DELETION_CONTACT_EMAIL", "deletion@example.test");
    vi.stubEnv("ACCOUNT_DELETION_CONTACT_VERIFIED", "false");
    const html = await page();
    expect(html).not.toContain("mailto:");
    expect(html).toContain("pending owner verification");
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/forgot-password"');
  });
  it("offers an actionable monitored-contact fallback once verified", async () => {
    vi.stubEnv("ACCOUNT_DELETION_CONTACT_EMAIL", "deletion@example.test");
    vi.stubEnv("ACCOUNT_DELETION_CONTACT_VERIFIED", "true");
    expect(await page()).toContain('href="mailto:deletion@example.test?subject=Couplemetric%20account%20deletion"');
  });
  it("keeps the fallback gated if the verified address is invalid", async () => {
    vi.stubEnv("ACCOUNT_DELETION_CONTACT_EMAIL", "invalid");
    vi.stubEnv("ACCOUNT_DELETION_CONTACT_VERIFIED", "true");
    expect(await page()).not.toContain("mailto:");
  });
});
