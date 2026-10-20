/**
 * Hourly reminder job (driven by .github/workflows/push-reminders.yml via
 * GET /api/push/reminders).
 *
 *  - Daily log reminder: opted-in users whose reminderHourUtc matches the
 *    current UTC hour and who have not logged today.
 *  - Trial day-5 reminder: billing trials ending 36h-60h from now, sent once
 *    (guarded by trialReminderSentAt IS NULL at write time).
 */

import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pushTokens, users } from "@/lib/db/schema";
import { sendPush, type PushMessage } from "./fcm";

const HOUR_MS = 3_600_000;
export const TRIAL_WINDOW_START_HOURS = 36;
export const TRIAL_WINDOW_END_HOURS = 60;

export interface DailyReminderRow {
  id: string;
  pushOptIn: boolean | null;
  reminderHourUtc: number | null;
  lastLogDate: string | Date | null;
}

export interface TrialReminderRow {
  id: string;
  billingTrialEndsAt: Date | string | null;
  trialReminderSentAt: Date | string | null;
}

export const DAILY_REMINDER: PushMessage = {
  title: "How was today?",
  body: "Take two minutes to log your day and keep your streak alive.",
  data: { route: "/daily" },
};

export const TRIAL_REMINDER: PushMessage = {
  title: "Your free trial ends in 2 days",
  body: "Keep unlimited exercises and AI coaching by staying on Premium.",
  data: { route: "/settings" },
};

function isoDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().split("T")[0] : value.slice(0, 10);
}

export function pickDailyReminderUsers(rows: DailyReminderRow[], nowUtc: Date): string[] {
  const hour = nowUtc.getUTCHours();
  const today = isoDate(nowUtc);
  return rows
    .filter(row => row.pushOptIn === true && row.reminderHourUtc === hour && (row.lastLogDate == null || isoDate(row.lastLogDate) < today))
    .map(row => row.id);
}

export function trialWindow(nowUtc: Date): { start: Date; end: Date } {
  return { start: new Date(nowUtc.getTime() + TRIAL_WINDOW_START_HOURS * HOUR_MS), end: new Date(nowUtc.getTime() + TRIAL_WINDOW_END_HOURS * HOUR_MS) };
}

export function pickTrialDay5Users(rows: TrialReminderRow[], nowUtc: Date): string[] {
  const { start, end } = trialWindow(nowUtc);
  return rows
    .filter(row => {
      if (row.trialReminderSentAt != null || row.billingTrialEndsAt == null) return false;
      const endsAt = new Date(row.billingTrialEndsAt).getTime();
      return endsAt >= start.getTime() && endsAt <= end.getTime();
    })
    .map(row => row.id);
}

/** Sends to every device of a user; drops tokens FCM reports as unregistered. Returns true if at least one device received it. */
async function deliver(tokens: string[], msg: PushMessage): Promise<boolean> {
  const db = getDb();
  let delivered = false;
  for (const token of tokens) {
    const result = await sendPush(token, msg);
    if (result === "sent") delivered = true;
    else if (result === "unregistered") await db.delete(pushTokens).where(eq(pushTokens.token, token));
  }
  return delivered;
}

export async function runReminders(nowUtc: Date = new Date()): Promise<{ daily: number; trial: number }> {
  const db = getDb();
  const { start, end } = trialWindow(nowUtc);

  const candidates = await db
    .select()
    .from(users)
    .where(and(
      eq(users.pushOptIn, true),
      or(
        eq(users.reminderHourUtc, nowUtc.getUTCHours()),
        and(isNull(users.trialReminderSentAt), gte(users.billingTrialEndsAt, start), lte(users.billingTrialEndsAt, end)),
      ),
    ));

  const dailyIds = pickDailyReminderUsers(candidates, nowUtc);
  const trialIds = pickTrialDay5Users(candidates, nowUtc);
  const targetIds = [...new Set([...dailyIds, ...trialIds])];
  if (targetIds.length === 0) return { daily: 0, trial: 0 };

  const tokenRows = await db.select().from(pushTokens).where(inArray(pushTokens.userId, targetIds));
  const tokensByUser = new Map<string, string[]>();
  for (const row of tokenRows) tokensByUser.set(row.userId, [...(tokensByUser.get(row.userId) ?? []), row.token]);

  let daily = 0;
  for (const id of dailyIds) {
    const tokens = tokensByUser.get(id);
    if (tokens?.length && await deliver(tokens, DAILY_REMINDER)) daily++;
  }

  let trial = 0;
  for (const id of trialIds) {
    const tokens = tokensByUser.get(id);
    if (!tokens?.length || !(await deliver(tokens, TRIAL_REMINDER))) continue;
    trial++;
    await db.update(users).set({ trialReminderSentAt: nowUtc }).where(and(eq(users.id, id), isNull(users.trialReminderSentAt)));
  }

  return { daily, trial };
}
