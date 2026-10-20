import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  selectRows: [] as unknown[],
  inserted: [{ id: "new-user" }],
  createSession: vi.fn(),
  verify: vi.fn(async () => true),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`Redirect:${url}`); } }));
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: async () => mocks.selectRows }) }) }),
    insert: () => ({ values: () => ({ returning: async () => mocks.inserted }) }),
  }),
}));
vi.mock("../password", () => ({ hashPassword: async () => "hashed", verifyPassword: mocks.verify }));
vi.mock("../session", () => ({ createSession: mocks.createSession, deleteSession: vi.fn() }));
vi.mock("@/lib/referrals", () => ({ processReferral: vi.fn() }));
import { loginAction, registerAction } from "@/lib/auth/actions";

function form(values: Record<string, string>) { const data = new FormData(); for (const [k, v] of Object.entries(values)) data.set(k, v); return data; }
const creds = { email: "qa@example.test", password: "password123", name: "QA Tester" };

describe("auth actions post-auth routing (D-02)", () => {
  beforeEach(() => { mocks.selectRows = []; mocks.createSession.mockClear(); mocks.verify.mockClear(); });

  it("register sends the new account straight to /onboarding", async () => {
    await expect(registerAction(form(creds))).rejects.toThrow("Redirect:/onboarding");
    expect(mocks.createSession).toHaveBeenCalledWith("new-user");
  });

  it("register still honours an invite code first", async () => {
    await expect(registerAction(form({ ...creds, invite: "ABC123" }))).rejects.toThrow(/Redirect:\/invite\//);
  });

  it("login sends unfinished users to /onboarding and finished users to /overview", async () => {
    mocks.selectRows = [{ id: "u1", passwordHash: "x", onboardingCompleted: false }];
    await expect(loginAction(form(creds))).rejects.toThrow("Redirect:/onboarding");
    mocks.selectRows = [{ id: "u1", passwordHash: "x", onboardingCompleted: true }];
    await expect(loginAction(form(creds))).rejects.toThrow("Redirect:/overview");
  });

  it("login keeps rejecting bad credentials without redirecting", async () => {
    mocks.selectRows = [];
    expect(await loginAction(form(creds))).toEqual({ error: "Invalid email or password" });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});
