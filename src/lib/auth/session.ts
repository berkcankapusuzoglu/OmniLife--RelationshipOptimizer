import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "session_token";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SessionData {
  version: 1;
  userId: string;
  expiresAt: number;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret.trim(), "utf8") < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes; use a randomly generated secret.");
  }
  return secret;
}

function sign(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export async function createSession(userId: string): Promise<void> {
  const secret = sessionSecret();
  const expiresAt = Date.now() + SESSION_DURATION_MS;

  const sessionData: SessionData = { version: 1, userId, expiresAt };
  const payload = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
  const encoded = `${payload}.${sign(payload, secret).toString("base64url")}`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encoded, {
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

  if (!cookie?.value) {
    return null;
  }

  try {
    // Authenticate the exact encoded bytes before trusting any payload fields.
    if (cookie.value.length > 4096) return null;
    const parts = cookie.value.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) {
      return null;
    }
    const received = Buffer.from(signature, "base64url");
    const expected = sign(payload, sessionSecret());
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return null;
    }
    if (received.toString("base64url") !== signature) return null;

    const decoded = Buffer.from(payload, "base64url");
    if (decoded.toString("base64url") !== payload) return null;
    const sessionData: unknown = JSON.parse(decoded.toString("utf8"));

    if (
      !sessionData || typeof sessionData !== "object" ||
      !("version" in sessionData) || sessionData.version !== 1 ||
      !("userId" in sessionData) || typeof sessionData.userId !== "string" ||
      !sessionData.userId.trim() ||
      !("expiresAt" in sessionData) || typeof sessionData.expiresAt !== "number" ||
      !Number.isSafeInteger(sessionData.expiresAt) || Date.now() >= sessionData.expiresAt
    ) {
      return null;
    }

    return { userId: sessionData.userId };
  } catch {
    return null;
  }
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
