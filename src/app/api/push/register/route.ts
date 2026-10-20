/**
 * Push token registration for the signed-in user.
 *
 *   POST   { token, platform }  upsert the device token, opt in, and set
 *                               reminderHourUtc to the modal UTC hour of the
 *                               last 14 daily logs (default 20:00 UTC).
 *   DELETE { token }            remove the device token and opt out.
 */

import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { dailyLogs, pushTokens, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// Route files may only export HTTP handlers and route config, so helpers stay module-private.
const DEFAULT_REMINDER_HOUR_UTC = 20;
const LOG_SAMPLE_SIZE = 14;

const registerInput = z.object({
  token: z.string().trim().min(1).max(4096),
  platform: z.enum(["android", "ios", "web"]),
});
const unregisterInput = z.object({ token: z.string().trim().min(1).max(4096) });

async function parseBody<T>(req: NextRequest, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const result = schema.safeParse(await req.json());
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Modal UTC hour of the given log timestamps (newest first); ties go to the most recent log. */
function modalReminderHour(createdAts: Array<Date | null>): number {
  const counts = new Map<number, number>();
  const firstSeen = new Map<number, number>();
  createdAts.forEach((createdAt, index) => {
    if (!createdAt) return;
    const hour = createdAt.getUTCHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
    if (!firstSeen.has(hour)) firstSeen.set(hour, index);
  });
  let best: number | null = null;
  for (const [hour, count] of counts) {
    if (best === null || count > counts.get(best)! || (count === counts.get(best)! && firstSeen.get(hour)! < firstSeen.get(best)!)) best = hour;
  }
  return best ?? DEFAULT_REMINDER_HOUR_UTC;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireAuth();
  const input = await parseBody(req, registerInput);
  if (!input) return NextResponse.json({ error: "Expected { token, platform: android | ios | web }." }, { status: 400 });

  const db = getDb();
  const recentLogs = await db
    .select({ createdAt: dailyLogs.createdAt })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, user.id))
    .orderBy(desc(dailyLogs.createdAt))
    .limit(LOG_SAMPLE_SIZE);
  const reminderHourUtc = modalReminderHour(recentLogs.map(log => log.createdAt));

  const now = new Date();
  await db
    .insert(pushTokens)
    .values({ token: input.token, userId: user.id, platform: input.platform, createdAt: now, lastSeenAt: now })
    .onConflictDoUpdate({ target: pushTokens.token, set: { userId: user.id, platform: input.platform, lastSeenAt: now } });
  await db.update(users).set({ pushOptIn: true, reminderHourUtc }).where(eq(users.id, user.id));

  return NextResponse.json({ ok: true, reminderHourUtc }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const user = await requireAuth();
  const input = await parseBody(req, unregisterInput);
  if (!input) return NextResponse.json({ error: "Expected { token }." }, { status: 400 });

  const db = getDb();
  await db.delete(pushTokens).where(and(eq(pushTokens.token, input.token), eq(pushTokens.userId, user.id)));
  await db.update(users).set({ pushOptIn: false }).where(eq(users.id, user.id));

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
