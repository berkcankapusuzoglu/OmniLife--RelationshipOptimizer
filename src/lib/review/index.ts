"use client";

import { isNativePlatform } from "@/lib/capacitor/platform";

export const REVIEW_ASKED_KEY = "cm.reviewAsked";
export const REVIEW_LOG_COUNT_KEY = "cm.reviewLogCount";
export const REVIEW_LAST_DAY_KEY = "cm.reviewLastDay";

/** Three logs in means the habit took, so the star is about the app and not a
 *  first impression. Play ratings are permanent, so we only get one shot. */
export const REVIEW_LOG_THRESHOLD = 3;

/** Pure policy, so the one-shot rule is testable without a device. */
export function shouldRequestReview({
  logCount,
  alreadyAsked,
}: {
  logCount: number;
  alreadyAsked: boolean;
}): boolean {
  if (alreadyAsked) return false;
  return Number.isFinite(logCount) && logCount >= REVIEW_LOG_THRESHOLD;
}

/** Local calendar day, per the project's YYYY-MM-DD convention. */
function today(): string {
  return new Date().toISOString().split("T")[0] as string;
}

function readCount(): number {
  const raw = localStorage.getItem(REVIEW_LOG_COUNT_KEY);
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Call after a daily log actually saved. Counts *distinct days* logged on this
 * device and, on the third one, opens the Play in-app review flow exactly once.
 * `submitDailyLog` upserts, so re-editing one day must not advance the count:
 * otherwise three day-one edits would spend the one permanent rating ask.
 * Resolves `true` only when the flow was handed to Play; the web, a storage
 * failure and Google's silent quota no-op are all indistinguishable silence.
 */
export async function recordLogAndMaybeRequestReview(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  let asked: boolean;
  let count: number;
  try {
    asked = localStorage.getItem(REVIEW_ASKED_KEY) === "1";
    const day = today();
    if (localStorage.getItem(REVIEW_LAST_DAY_KEY) === day) {
      // Same day already counted: an edit, not a new day of the habit.
      return false;
    }
    count = readCount() + 1;
    localStorage.setItem(REVIEW_LOG_COUNT_KEY, String(count));
    localStorage.setItem(REVIEW_LAST_DAY_KEY, day);
  } catch {
    // Without storage we cannot honour "at most once ever", so never ask.
    return false;
  }

  if (!shouldRequestReview({ logCount: count, alreadyAsked: asked })) return false;

  // Mark before asking: a failed or quota-suppressed flow must not retry later.
  try {
    localStorage.setItem(REVIEW_ASKED_KEY, "1");
  } catch {
    return false;
  }

  try {
    const { InAppReview } = await import("@capacitor-community/in-app-review");
    await InAppReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
