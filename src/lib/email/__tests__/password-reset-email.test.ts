import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));
import { sendPasswordResetEmail } from "@/lib/email";

describe("password reset email", () => {
  beforeEach(() => { send.mockReset().mockResolvedValue({ data: { id: "mail-id" }, error: null }); vi.stubEnv("RESEND_API_KEY", "key-secret"); vi.stubEnv("RESEND_FROM_EMAIL", "Couplemetric <support@example.test>"); vi.stubEnv("NODE_ENV", "test"); });
  it("uses configured sender and escapes reset URL in HTML", async () => {
    const url = "https://example.test/reset?token=a&x=<b>";
    await sendPasswordResetEmail("person@example.test", url);
    expect(send.mock.calls[0][0].from).toBe("Couplemetric <support@example.test>");
    expect(send.mock.calls[0][0].html).toContain("&amp;x=&lt;b&gt;");
  });
  it("rejects missing configuration and Resend returned or thrown errors with static messages", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); await expect(sendPasswordResetEmail("a@b.test", "https://x.test")).rejects.toThrow("Password reset email is not configured");
    vi.stubEnv("RESEND_API_KEY", "key"); send.mockResolvedValueOnce({ error: { message: "recipient secret" } }); await expect(sendPasswordResetEmail("a@b.test", "https://x.test")).rejects.toThrow("Password reset email delivery failed");
    send.mockRejectedValueOnce(new Error("provider secret")); await expect(sendPasswordResetEmail("a@b.test", "https://x.test")).rejects.toThrow("Password reset email delivery failed");
  });
  it("rejects Resend's test sender in production", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("RESEND_FROM_EMAIL", "Couplemetric <onboarding@resend.dev>");
    await expect(sendPasswordResetEmail("a@b.test", "https://x.test")).rejects.toThrow("Password reset email is not configured");
  });
});
