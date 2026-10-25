import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession, deleteSession, getSession, renewSession } from "../session";

vi.mock("server-only", () => ({}));

const jar = vi.hoisted(() => ({
  value: undefined as string | undefined,
  options: {} as Record<string, unknown>,
}));

// Next's cookie API requires a request scope; retain its storage side effects.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => name === "session_token" && jar.value !== undefined
      ? { name, value: jar.value } : undefined,
    set: (name: string, value: string, options: Record<string, unknown>) => {
      if (name !== "session_token") throw new Error("Unexpected cookie");
      jar.value = value;
      jar.options = options;
    },
    delete: (name: string) => {
      if (name !== "session_token") throw new Error("Unexpected cookie");
      jar.value = undefined;
    },
  }),
}));

const secret = "test-only-session-key-with-at-least-32-bytes";
const now = 1_800_000_000_000;
// Raised from 7 to 30 days on 2026-10-25 after two testers reported the app not
// staying signed in; see src/lib/auth/session-token.ts.
const duration = 30 * 24 * 60 * 60 * 1000;

function signedFixture(payload: unknown, key = secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${createHmac("sha256", key).update(encoded).digest("base64url")}`;
}

describe("signed sessions", () => {
  beforeEach(() => {
    jar.value = undefined;
    jar.options = {};
    vi.stubEnv("SESSION_SECRET", secret);
    vi.stubEnv("NODE_ENV", "test");
    vi.spyOn(Date, "now").mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("round-trips a signed identity with bounded cookie lifetime and protections", async () => {
    await createSession("user-123");
    expect(await getSession()).toEqual({ userId: "user-123" });
    expect(jar.value).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
    expect(jar.options).toEqual({
      path: "/", httpOnly: true, sameSite: "lax", secure: false,
      expires: new Date(now + duration),
    });
  });

  it("accepts an independently signed versioned payload", async () => {
    jar.value = signedFixture({ version: 1, userId: "user-123", expiresAt: now + 1000 });
    expect(await getSession()).toEqual({ userId: "user-123" });
  });

  it("sets secure cookies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await createSession("user-123");
    expect(jar.options.secure).toBe(true);
    expect(await getSession()).toEqual({ userId: "user-123" });
  });

  it("rejects a legacy unsigned cookie even with a future expiry", async () => {
    jar.value = Buffer.from(JSON.stringify({ userId: "victim", token: "anything", expiresAt: now + duration })).toString("base64");
    expect(await getSession()).toBeNull();
  });

  it("rejects an altered identity under the original signature", async () => {
    await createSession("user-123");
    const signature = jar.value!.split(".")[1];
    jar.value = `${Buffer.from(JSON.stringify({ version: 1, userId: "victim", expiresAt: now + duration })).toString("base64url")}.${signature}`;
    expect(await getSession()).toBeNull();
  });

  it("rejects a modified signature of the expected length", async () => {
    jar.value = signedFixture({ version: 1, userId: "user-123", expiresAt: now + 1000 });
    const [payload, signature] = jar.value.split(".");
    jar.value = `${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    expect(await getSession()).toBeNull();
  });

  it("rejects cookies signed with a different secret", async () => {
    jar.value = signedFixture({ version: 1, userId: "user-123", expiresAt: now + 1000 }, "another-test-only-key-with-32-bytes");
    expect(await getSession()).toBeNull();
  });

  it.each([undefined, "", "garbage", ".", "abc.def", "abc.def.extra", "a".repeat(5000)])("rejects malformed cookie %s", async (value) => {
    jar.value = value;
    expect(await getSession()).toBeNull();
  });

  it.each([
    null, [], { version: 2, userId: "user-123", expiresAt: now + 1000 },
    { userId: "user-123", expiresAt: now + 1000 },
    { version: 1, userId: "", expiresAt: now + 1000 },
    { version: 1, userId: 123, expiresAt: now + 1000 },
    { version: 1, userId: "user-123" },
    { version: 1, userId: "user-123", expiresAt: String(now + 1000) },
    { version: 1, userId: "user-123", expiresAt: now + 0.5 },
  ])("rejects authenticated invalid payload %#", async (payload) => {
    jar.value = signedFixture(payload);
    expect(await getSession()).toBeNull();
  });

  it.each([now - 1, now])("rejects expired cookies at %s", async (expiresAt) => {
    jar.value = signedFixture({ version: 1, userId: "user-123", expiresAt });
    expect(await getSession()).toBeNull();
  });

  it("rejects padded/noncanonical URL encoding", async () => {
    jar.value = signedFixture({ version: 1, userId: "user-123", expiresAt: now + 1000 });
    jar.value += "=";
    expect(await getSession()).toBeNull();
  });

  it.each([undefined, "", "short", " ".repeat(32)])("fails closed for missing/weak production secret %#", async (key) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", key);
    await expect(createSession("user-123")).rejects.toThrow("SESSION_SECRET");
    expect(jar.value).toBeUndefined();
    jar.value = signedFixture({ version: 1, userId: "user-123", expiresAt: now + 1000 });
    expect(await getSession()).toBeNull();
  });

  it("requires a configured secret in development too", async () => {
    vi.stubEnv("SESSION_SECRET", undefined);
    await expect(createSession("user-123")).rejects.toThrow("SESSION_SECRET");
  });

  it("deletes the session cookie", async () => {
    await createSession("user-123");
    await deleteSession();
    expect(await getSession()).toBeNull();
  });

  it("renews only a valid session belonging to the requested user", async () => {
    await createSession("user-123");
    const previous = jar.value;
    vi.mocked(Date.now).mockReturnValue(now + 1000);
    await renewSession("other-user");
    expect(jar.value).toBe(previous);
    await renewSession("user-123");
    expect(jar.options.expires).toEqual(new Date(now + 1000 + duration));
    expect(await getSession()).toEqual({ userId: "user-123" });
  });

  it("does not renew an unsigned identity", async () => {
    jar.value = Buffer.from(JSON.stringify({ userId: "victim", expiresAt: now + duration })).toString("base64");
    const previous = jar.value;
    await renewSession("victim");
    expect(jar.value).toBe(previous);
  });
});
