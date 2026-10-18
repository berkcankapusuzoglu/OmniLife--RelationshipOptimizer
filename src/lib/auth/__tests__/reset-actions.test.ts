import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ selectRows: [] as unknown[], claim: [] as unknown[], userRows: [{ id: "u1" }], log: vi.fn(), send: vi.fn(), tx: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: mocks.send }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`Redirect:${url}`); } }));
vi.mock("@/lib/db", () => ({ getDb: () => ({ select: () => ({ from: () => ({ where: () => ({ limit: async () => mocks.selectRows }) }) }), insert: () => ({ values: async () => undefined }), transaction: mocks.tx }) }));
vi.mock("../password", () => ({ hashPassword: async () => "hashed" }));
import { requestPasswordResetAction, resetPasswordAction } from "@/lib/auth/reset-actions";

function form(values: Record<string, string>) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; }
const validReset = { token: "secret-token", password: "new-password", confirm: "new-password" };

describe("password reset actions", () => {
  beforeEach(() => { mocks.selectRows = []; mocks.claim = [{ userId: "u1" }]; mocks.log.mockClear(); vi.spyOn(console, "error").mockImplementation(mocks.log); mocks.send.mockReset(); mocks.tx.mockReset().mockImplementation(async (fn) => fn({ update: () => ({ set: () => ({ where: () => ({ returning: async () => mocks.claim }) }) }) })); vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test"); });
  it("returns the same success for known and unknown users, with static sanitized logging on delivery error", async () => {
    expect(await requestPasswordResetAction(form({ email: "unknown@example.test" }))).toEqual({ success: true });
    mocks.selectRows = [{ id: "u1", email: "known@example.test" }]; mocks.send.mockRejectedValue(new Error("private recipient and provider details"));
    expect(await requestPasswordResetAction(form({ email: "known@example.test" }))).toEqual({ success: true });
    expect(mocks.log).toHaveBeenCalledWith("Password reset delivery operation failed");
    expect(JSON.stringify(mocks.log.mock.calls)).not.toContain("known@example.test");
  });
  it("keeps validation responses and redirects only after a committed transaction", async () => {
    expect(await resetPasswordAction(form({ ...validReset, confirm: "different" }))).toEqual({ error: "Passwords do not match." });
    expect(await resetPasswordAction(form(validReset))).toHaveProperty("error", "This reset link is invalid or has expired. Please request a new one.");
    mocks.selectRows = [{ id: "r1", userId: "u1" }];
    await expect(resetPasswordAction(form(validReset))).rejects.toThrow("Redirect:/login?reset=success");
    mocks.tx.mockImplementationOnce(async (fn) => fn({ update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) }) }));
    expect(await resetPasswordAction(form(validReset))).toHaveProperty("error", "This reset link is invalid or has expired. Please request a new one.");
    mocks.tx.mockRejectedValueOnce(new Error("transaction failed"));
    await expect(resetPasswordAction(form(validReset))).rejects.toThrow("transaction failed");
  });
});
