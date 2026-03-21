import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Produce a deterministic couple ID from two user UUIDs.
 * Sorts alphabetically so coupleId(a, b) === coupleId(b, a).
 */
export function coupleId(userA: string, userB: string): string {
  return [userA, userB].sort().join("::");
}
