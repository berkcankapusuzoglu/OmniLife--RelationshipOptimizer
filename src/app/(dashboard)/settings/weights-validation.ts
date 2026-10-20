import type { Weights } from "@/lib/engine/types";

/** Clamp a percentage typed into a weight input to the 0–100 range. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function inRange(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

/**
 * Client-side mirror of the server `weightsInput` schema: every weight must be
 * a finite number between 0 and 1. Returns a user-facing message or null.
 */
export function validateWeights(weights: Weights): string | null {
  const all = [
    weights.alpha,
    weights.beta,
    ...Object.values(weights.pillar),
    ...Object.values(weights.rel),
  ];
  if (!all.every(inRange)) return "Each weight must be between 0 and 100.";
  return null;
}
