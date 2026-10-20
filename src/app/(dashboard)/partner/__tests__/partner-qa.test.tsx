import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { linkPartner, unlinkPartner } from "@/app/(dashboard)/partner/actions";
import { PartnerClient } from "@/app/(dashboard)/partner/partner-client";

type User = { id: string; partnerId: string | null; partnerInviteCode: string | null };
const state = vi.hoisted(() => ({
  user: { id: "A", partnerId: null, partnerInviteCode: "ABC123" } as User,
  claim: null as null | ((actorId: string, code: string) => Promise<boolean>),
  transaction: null as null | (() => Promise<void>),
  revalidated: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDb: () => ({ transaction: async () => { await state.transaction?.(); } }) }));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => state.user }));
vi.mock("@/lib/auth/authorization", () => ({ claimPartnerInvite: (actorId: string, code: string) => state.claim!(actorId, code) }));
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => { state.revalidated.push(path); } }));

describe("linkPartner result (D-06)", () => {
  beforeEach(() => {
    state.user = { id: "A", partnerId: null, partnerInviteCode: "ABC123" };
    state.claim = async () => true;
    state.transaction = null;
    state.revalidated = [];
  });

  it("returns ok and revalidates when the claim succeeds", async () => {
    const calls: string[] = [];
    state.claim = async (actor, code) => { calls.push(`${actor}:${code}`); return true; };
    expect(await linkPartner("bobcod")).toEqual({ ok: true });
    expect(calls).toEqual(["A:BOBCOD"]);
    expect(state.revalidated).toEqual(["/partner"]);
  });

  it("rejects a malformed code inline instead of throwing", async () => {
    state.claim = async () => { throw new Error("must not be called"); };
    const result = await linkPartner("ab");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/6-character code/);
    expect(state.revalidated).toEqual([]);
  });

  it("explains when the user enters their own invite code", async () => {
    state.claim = async () => { throw new Error("must not be called"); };
    const result = await linkPartner("abc123");
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/your own invite code/i) });
  });

  it("explains when the code is unknown or already used", async () => {
    state.claim = async () => false;
    const result = await linkPartner("ZZZZZZ");
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/not valid or has already been used/i) });
    expect(state.revalidated).toEqual([]);
  });

  it("refuses when already linked", async () => {
    state.user.partnerId = "B";
    const result = await linkPartner("BOBCOD");
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/already linked/i) });
  });

  it("hides database failures behind a generic message", async () => {
    state.claim = async () => { throw new Error("private database details"); };
    const result = await linkPartner("BOBCOD");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain("private database details");
      expect(result.error).toMatch(/try again/i);
    }
  });
});

describe("unlinkPartner result (D-21)", () => {
  beforeEach(() => {
    state.user = { id: "A", partnerId: "B", partnerInviteCode: null };
    state.transaction = null;
    state.revalidated = [];
  });

  it("returns ok after unlinking", async () => {
    expect(await unlinkPartner()).toEqual({ ok: true });
    expect(state.revalidated).toEqual(["/partner"]);
  });

  it("returns an error when not linked", async () => {
    state.user.partnerId = null;
    expect(await unlinkPartner()).toEqual({ ok: false, error: expect.stringMatching(/not linked/i) });
  });

  it("returns a generic error when the database fails", async () => {
    state.transaction = async () => { throw new Error("private database details"); };
    const result = await unlinkPartner();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toContain("private database details");
    expect(state.revalidated).toEqual([]);
  });
});

describe("PartnerClient markup (D-21, D-29, D-67)", () => {
  function render(props: Partial<React.ComponentProps<typeof PartnerClient>> = {}) {
    vi.stubGlobal("React", React);
    return renderToStaticMarkup(
      <PartnerClient
        userName="Alice"
        inviteCode={null}
        partner={{ id: "B", name: "Bob", email: "a.very.long.partner.email.address@example.test" }}
        partnerScore={72}
        userScore={60}
        {...props}
      />,
    );
  }

  it("linked view wraps the header row and truncates long identity text", () => {
    const html = render();
    expect(html).toContain("flex-wrap");
    expect(html).toContain("min-w-0");
    expect(html).toMatch(/class="[^"]*truncate[^"]*"[^>]*>a\.very\.long\.partner\.email\.address@example\.test</);
    expect(html).toContain("Linked");
  });

  it("linked view hides the invite step entirely", () => {
    const html = render();
    expect(html).not.toContain("Enter Partner");
    expect(html).not.toContain("Share Your Invite Link");
    expect(html).not.toContain("Challenge Your Partner");
  });

  it("linked view renders an Unlink trigger but no immediate destructive action", () => {
    const html = render();
    expect(html).toContain("Unlink Partner");
    // The confirmation dialog is closed until the trigger is tapped.
    expect(html).not.toContain("Unlink your partner?");
  });

  it("unlinked view renders the code form with an accessible error slot", () => {
    const html = render({ partner: null, inviteCode: "ABC123" });
    expect(html).toContain('id="partnerCode"');
    expect(html).toContain("Link Partner");
    expect(html).not.toContain('role="alert"');
  });
});
