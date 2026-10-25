import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_DURATION_MS,
  decodeSessionToken,
  encodeSessionToken,
} from "./session-token";

/**
 * Cookie-backed sessions. The signing and verification live in `session-token`
 * so the proxy can share them for sliding renewal; this module owns the cookie.
 */

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret.trim(), "utf8") < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes; use a randomly generated secret.");
  }
  return secret;
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = encodeSessionToken({ version: 1, userId, expiresAt }, sessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
  });
}

export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie?.value) return null;

  // Reading a session fails closed: a missing or weak secret means nobody is
  // authenticated, never an unhandled error on a page render. Writing one still
  // throws, so a misconfigured deployment cannot silently issue sessions.
  let secret: string;
  try {
    secret = sessionSecret();
  } catch {
    return null;
  }

  const data = decodeSessionToken(cookie.value, secret);
  return data ? { userId: data.userId } : null;
}

export async function renewSession(userId: string): Promise<void> {
  const existing = await getSession();
  if (!existing || existing.userId !== userId) return;
  await createSession(userId);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
