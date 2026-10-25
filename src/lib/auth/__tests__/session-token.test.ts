import { describe, expect, it } from "vitest";
import {
  encodeSessionToken,
  decodeSessionToken,
  shouldRenewSession,
  SESSION_DURATION_MS,
  SESSION_RENEW_AFTER_MS,
} from "@/lib/auth/session-token";

/**
 * Tester feedback, twice: "the app doesn't stay signed in".
 *
 * `renewSession()` was implemented and unit-tested but never called from any
 * production path, so a session expired a fixed period after login no matter how
 * actively the person used the app. These are the pure pieces the proxy needs to
 * slide that expiry forward on each visit — the proxy can set cookies, a Server
 * Component cannot.
 */

const SECRET = "x".repeat(48);

describe("session token", () => {
  it("round-trips a signed session", () => {
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    const token = encodeSessionToken({ version: 1, userId: "user-1", expiresAt }, SECRET);
    expect(decodeSessionToken(token, SECRET)).toEqual({
      version: 1,
      userId: "user-1",
      expiresAt,
    });
  });

  it("rejects a token signed with a different secret", () => {
    const token = encodeSessionToken(
      { version: 1, userId: "user-1", expiresAt: Date.now() + 1000 },
      SECRET
    );
    expect(decodeSessionToken(token, "y".repeat(48))).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = encodeSessionToken(
      { version: 1, userId: "user-1", expiresAt: Date.now() + 1000 },
      SECRET
    );
    const [, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ version: 1, userId: "attacker", expiresAt: Date.now() + 1000 })
    ).toString("base64url");
    expect(decodeSessionToken(`${forged}.${signature}`, SECRET)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = encodeSessionToken(
      { version: 1, userId: "user-1", expiresAt: Date.now() - 1 },
      SECRET
    );
    expect(decodeSessionToken(token, SECRET)).toBeNull();
  });

  it.each(["", "nodot", "a.b.c", "!!!.???"])("rejects the malformed token %s", (token) => {
    expect(decodeSessionToken(token, SECRET)).toBeNull();
  });
});

describe("shouldRenewSession", () => {
  const now = 1_700_000_000_000;

  it("renews once the session has been used past the renewal threshold", () => {
    // Issued long enough ago that less than the renewal window remains.
    const expiresAt = now + SESSION_DURATION_MS - SESSION_RENEW_AFTER_MS - 1;
    expect(shouldRenewSession(expiresAt, now)).toBe(true);
  });

  it("does not renew a freshly issued session", () => {
    expect(shouldRenewSession(now + SESSION_DURATION_MS, now)).toBe(false);
  });

  it("does not renew an already expired session", () => {
    expect(shouldRenewSession(now - 1, now)).toBe(false);
  });

  it("keeps an actively used session alive indefinitely", () => {
    // Visit every day for a year: the expiry should always stay in the future.
    let expiresAt = now + SESSION_DURATION_MS;
    for (let day = 1; day <= 365; day++) {
      const today = now + day * 24 * 60 * 60 * 1000;
      expect(today).toBeLessThan(expiresAt);
      if (shouldRenewSession(expiresAt, today)) expiresAt = today + SESSION_DURATION_MS;
    }
  });
});
