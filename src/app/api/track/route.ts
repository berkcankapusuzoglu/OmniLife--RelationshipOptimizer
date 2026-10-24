import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { parseTrackPayload } from "@/lib/analytics/payload";
import { getSession } from "@/lib/auth/session";

/**
 * Funnel event collector.
 *
 * Public and unauthenticated by design: the events that matter most (landing,
 * quiz, register) happen before signup. The body is untrusted, so it is validated
 * and stripped of anything personal by `parseTrackPayload` first.
 *
 * It always answers 204, including on failure. A collector that returns errors
 * would let a client loop retry against the database, and nothing the user is
 * doing should depend on analytics succeeding.
 */

const SESSION_COOKIE = "cm_anon";
const MAX_BODY_BYTES = 4096;

export async function POST(request: Request) {
  const noContent = new NextResponse(null, { status: 204 });

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return noContent;

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return noContent;
    }

    const event = parseTrackPayload(body);
    if (!event) return noContent;

    // An anonymous id stitches pre-signup events to the account that follows.
    // It is a random opaque value, never derived from anything about the person.
    const cookieStore = await cookies();
    let sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId || !/^[0-9a-f-]{36}$/.test(sessionId)) {
      sessionId = randomUUID();
      cookieStore.set(SESSION_COOKIE, sessionId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 180,
      });
    }

    const session = await getSession();

    await getDb().insert(events).values({
      id: randomUUID(),
      name: event.name,
      properties: event.properties,
      userId: session?.userId ?? null,
      sessionId,
    });
  } catch {
    // Swallowed on purpose: see the note above.
  }

  return noContent;
}
