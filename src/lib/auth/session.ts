import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const SESSION_COOKIE = "session_token";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SessionData {
  userId: string;
  token: string;
  expiresAt: number;
}

export async function createSession(userId: string): Promise<void> {
  const token = uuidv4();
  const expiresAt = Date.now() + SESSION_DURATION_MS;

  const sessionData: SessionData = { userId, token, expiresAt };
  const encoded = btoa(JSON.stringify(sessionData));

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
    const sessionData: SessionData = JSON.parse(atob(cookie.value));

    if (Date.now() > sessionData.expiresAt) {
      return null;
    }

    return { userId: sessionData.userId };
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
