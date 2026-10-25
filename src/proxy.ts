import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_DURATION_MS,
  decodeSessionToken,
  encodeSessionToken,
  shouldRenewSession,
} from "@/lib/auth/session-token";

/**
 * Proxy runs on the Node.js runtime by default in Next 16, so it can use
 * node:crypto and, unlike a Server Component, set cookies on the response.
 *
 * Two jobs:
 *  - expose the request path to Server Components (the dashboard layout reads
 *    `x-pathname` to avoid an onboarding redirect loop);
 *  - slide the session expiry forward for anyone still using the app.
 *    `renewSession()` existed but nothing ever called it, so a session expired a
 *    fixed period after login however actively it was used — one of the causes
 *    behind "the app doesn't stay signed in".
 */
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  renewSessionCookie(request, response);

  return response;
}

function renewSessionCookie(request: NextRequest, response: NextResponse): void {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const secret = process.env.SESSION_SECRET;
  // Fail closed and quietly: the proxy runs on every request, and session
  // renewal is an optimisation. Anything invalid is left for the page to reject.
  if (!secret || Buffer.byteLength(secret.trim(), "utf8") < 32) return;

  const session = decodeSessionToken(token, secret);
  if (!session) return;

  const now = Date.now();
  if (!shouldRenewSession(session.expiresAt, now)) return;

  const expiresAt = now + SESSION_DURATION_MS;
  response.cookies.set(SESSION_COOKIE, encodeSessionToken({ ...session, expiresAt }, secret), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
