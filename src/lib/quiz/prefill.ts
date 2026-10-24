import { QUIZ_DIMENSIONS, type StoredQuizResult } from "@/lib/quiz";

/**
 * Carries quiz answers into the onboarding self-assessment.
 *
 * The quiz has always saved its answers and `loadQuizScores()` has always
 * existed, but nothing called it: people answered five questions, signed up, and
 * were asked the same five things again. That repetition sits at the highest
 * intent moment in the funnel, which is the worst place to add friction.
 *
 * Only the five dimensions the quiz actually asks about are overlaid. The other
 * four keep their neutral default rather than being invented.
 */

/**
 * How long a stored quiz may be used to prefill. A relationship assessment from
 * months ago is not a current self-report, and silently presenting it as one
 * would be worse than asking again.
 */
export const QUIZ_PREFILL_MAX_AGE_DAYS = 30;

function isFresh(takenAt: string): boolean {
  const taken = Date.parse(takenAt);
  if (Number.isNaN(taken)) return false;
  const ageDays = (Date.now() - taken) / (24 * 60 * 60 * 1000);
  return ageDays <= QUIZ_PREFILL_MAX_AGE_DAYS;
}

export function applyQuizPrefill(
  defaults: Record<string, number>,
  stored: StoredQuizResult | null
): Record<string, number> {
  const next = { ...defaults };
  if (!stored || !isFresh(stored.takenAt)) return next;

  for (const dimension of QUIZ_DIMENSIONS) {
    const value = stored.scores[dimension];
    if (Number.isInteger(value) && value >= 1 && value <= 10) {
      next[dimension] = value;
    }
  }
  return next;
}
