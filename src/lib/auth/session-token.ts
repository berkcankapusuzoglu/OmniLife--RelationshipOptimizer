import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pure session-token encoding and verification.
 *
 * Split out of `session.ts` (which is `server-only` and depends on
 * `next/headers`) so the proxy can verify and re-issue a session. Sliding
 * renewal has to happen there: the proxy can set cookies on the response, and a
 * Server Component cannot.
 */

export const SESSION_COOKIE = "session_token";

/**
 * Raised from 7 days to 30 (2026-10-25). Two testers reported the app not
 * staying signed in, and for a daily-habit app a one-week hard expiry logs out
 * anyone who skips a week. The cookie is still HMAC-signed, httpOnly and
 * expiring; only the window changed.
 */
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Re-issue once a session is within this much of its expiry. Renewing on every
 * single request would rewrite the cookie constantly for no benefit.
 */
export const SESSION_RENEW_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  version: 1;
  userId: string;
  expiresAt: number;
}

const MAX_TOKEN_LENGTH = 4096;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PAYLOAD_PATTERN = /^[A-Za-z0-9_-]+$/;

function sign(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function encodeSessionToken(data: SessionData, secret: string): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload, secret).toString("base64url")}`;
}

export function decodeSessionToken(token: string, secret: string): SessionData | null {
  try {
    if (!token || token.length > MAX_TOKEN_LENGTH) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    if (!PAYLOAD_PATTERN.test(payload) || !SIGNATURE_PATTERN.test(signature)) return null;

    // Authenticate the exact encoded bytes before trusting any payload field.
    const received = Buffer.from(signature, "base64url");
    const expected = sign(payload, secret);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    if (received.toString("base64url") !== signature) return null;

    const decoded = Buffer.from(payload, "base64url");
    if (decoded.toString("base64url") !== payload) return null;
    const data: unknown = JSON.parse(decoded.toString("utf8"));

    if (
      !data || typeof data !== "object" ||
      !("version" in data) || data.version !== 1 ||
      !("userId" in data) || typeof data.userId !== "string" || !data.userId.trim() ||
      !("expiresAt" in data) || typeof data.expiresAt !== "number" ||
      !Number.isSafeInteger(data.expiresAt) || Date.now() >= data.expiresAt
    ) {
      return null;
    }

    return { version: 1, userId: data.userId, expiresAt: data.expiresAt };
  } catch {
    return null;
  }
}

/** True when a still-valid session is close enough to expiry to re-issue. */
export function shouldRenewSession(expiresAt: number, now: number): boolean {
  if (expiresAt <= now) return false;
  return expiresAt - now < SESSION_DURATION_MS - SESSION_RENEW_AFTER_MS;
}
