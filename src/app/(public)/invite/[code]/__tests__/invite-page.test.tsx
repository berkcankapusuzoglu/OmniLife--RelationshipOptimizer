import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InvitePage from "@/app/(public)/invite/[code]/page";

type User = { id: string; name: string | null; partnerId: string | null; partnerInviteCode: string | null };
const state = vi.hoisted(() => ({
  inviter: null as null | { id: string; name: string | null },
  currentUser: null as null | User,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: async () => (state.inviter ? [state.inviter] : []) }) }) }),
  }),
}));
vi.mock("@/lib/auth/guard", () => ({ getCurrentUser: async () => state.currentUser }));
vi.mock("@/app/(public)/invite/[code]/actions", () => ({ acceptPartnerInvite: async () => {} }));

async function page(code = "BOBCOD") {
  vi.stubGlobal("React", React);
  return renderToStaticMarkup(await InvitePage({ params: Promise.resolve({ code }), searchParams: Promise.resolve({}) }));
}

describe("invite page unavailable states (D-67)", () => {
  beforeEach(() => {
    state.inviter = { id: "B", name: "Bob Private" };
    state.currentUser = null;
  });

  it("tells the owner that this is their own invite link", async () => {
    state.currentUser = { id: "B", name: "Bob Private", partnerId: null, partnerInviteCode: "BOBCOD" };
    const html = await page();
    expect(html).toContain("Invitation unavailable");
    expect(html).toContain('data-reason="own"');
    expect(html).toContain("your own invite link");
    expect(html).not.toContain('name="confirm"');
  });

  it("tells an already-linked user why they cannot accept, without the invite step", async () => {
    state.currentUser = { id: "A", name: "Alice", partnerId: "C", partnerInviteCode: null };
    const html = await page();
    expect(html).toContain('data-reason="linked"');
    expect(html).toContain("already linked with a partner");
    expect(html).not.toContain('name="confirm"');
    expect(html).not.toContain("/register?invite=");
  });

  it("already-linked users get the same message even when the code is unknown", async () => {
    state.inviter = null;
    state.currentUser = { id: "A", name: "Alice", partnerId: "C", partnerInviteCode: null };
    expect(await page("ZZZZZZ")).toContain('data-reason="linked"');
  });

  it("keeps the generic message for unknown codes", async () => {
    state.inviter = null;
    state.currentUser = { id: "A", name: "Alice", partnerId: null, partnerInviteCode: null };
    const html = await page("ZZZZZZ");
    expect(html).toContain('data-reason="generic"');
    expect(html).not.toContain("your own invite link");
  });

  it("still shows the confirmation step to an eligible signed-in user", async () => {
    state.currentUser = { id: "A", name: "Alice", partnerId: null, partnerInviteCode: null };
    const html = await page();
    expect(html).toContain('name="confirm"');
    expect(html).toContain("Bob invited you");
  });
});
