import { SCENARIO_PRESETS } from "@/lib/scenarios/presets";

/**
 * Pure decisions behind "Skip for now".
 *
 * Onboarding was the last gate before the first score, with no way out, so
 * anyone unwilling to answer five steps never reached the thing the app is for.
 * A skip has to leave a state the rest of the app already understands: a first
 * log and a first score, built from what the person actually gave us.
 *
 * Nothing here invents a self-report. A dimension the person never touched
 * stays at the neutral midpoint, exactly as the wizard's own default does, and
 * anything outside the 1-10 integer range is treated as not answered rather
 * than coerced into a plausible-looking number.
 */

const DIMENSION_KEYS = [
  "vitality",
  "growth",
  "security",
  "connection",
  "emotional",
  "trust",
  "fairness",
  "stress",
  "autonomy",
] as const;

export type SkipAssessment = Record<(typeof DIMENSION_KEYS)[number], number>;

/** The wizard's own untouched slider value; see `defaultScores()` in the client. */
export const NEUTRAL_DIMENSION_SCORE = 5;

export function resolveSkipAssessment(
  scores: Record<string, unknown> | undefined
): SkipAssessment {
  const resolved = {} as SkipAssessment;
  for (const key of DIMENSION_KEYS) {
    const value = scores?.[key];
    resolved[key] =
      typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10
        ? value
        : NEUTRAL_DIMENSION_SCORE;
  }
  return resolved;
}

export function resolveSkipScenarioMode(mode: unknown): string {
  return typeof mode === "string" && SCENARIO_PRESETS.some((p) => p.mode === mode)
    ? mode
    : "default";
}
