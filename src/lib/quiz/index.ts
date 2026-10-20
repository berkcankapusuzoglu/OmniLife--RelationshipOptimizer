// Pure helpers for the free relationship quiz: encoding, scoring, archetypes
// and the share/OG parameters derived from them. No side effects here except
// the explicitly named localStorage helpers at the bottom.

export const QUIZ_DIMENSIONS = ["emotional", "fairness", "trust", "growth", "stress"] as const;
export type QuizDimension = (typeof QUIZ_DIMENSIONS)[number];

export const QUIZ_DIMENSION_LABELS: Record<QuizDimension, string> = {
  emotional: "Emotional",
  fairness: "Fairness",
  trust: "Trust",
  growth: "Growth",
  stress: "Stress",
};

export type QuizScores = Record<QuizDimension, number>;

export interface Archetype {
  name: string;
  description: string;
  badge: string;
}

const base64Encode = (value: string): string =>
  typeof btoa === "function" ? btoa(value) : Buffer.from(value, "binary").toString("base64");
const base64Decode = (value: string): string =>
  typeof atob === "function" ? atob(value) : Buffer.from(value, "base64").toString("binary");

/** Encode the five 1–10 answers (quiz question order) for the result URL. */
export function encodeQuizScores(scores: number[]): string {
  return base64Encode(scores.join(","));
}

/** Decode a result URL parameter; null for anything that is not five 1–10 integers. */
export function decodeQuizScores(encoded: string): number[] | null {
  try {
    const scores = base64Decode(encoded).split(",").map(Number);
    if (scores.length !== QUIZ_DIMENSIONS.length) return null;
    if (scores.some((s) => !Number.isInteger(s) || s < 1 || s > 10)) return null;
    return scores;
  } catch {
    return null;
  }
}

export function toQuizScores(values: number[]): QuizScores {
  return Object.fromEntries(QUIZ_DIMENSIONS.map((key, i) => [key, values[i] ?? 5])) as QuizScores;
}

/** Relationship Pulse: five answers out of 10, scaled to 0–100. */
export function computePulse(values: number[]): number {
  return Math.round(values.reduce((a, b) => a + b, 0) * 2);
}

export function getPulseLabel(score: number): string {
  if (score < 40) return "Critical";
  if (score < 50) return "Needs Work";
  if (score < 60) return "Developing";
  if (score < 70) return "Growing";
  if (score < 80) return "Strong";
  if (score < 90) return "Thriving";
  return "Exceptional";
}

export function getPercentile(score: number): string {
  if (score >= 96) return "99";
  if (score >= 86) return "93";
  if (score >= 76) return "82";
  if (score >= 66) return "65";
  if (score >= 51) return "47";
  if (score >= 31) return "28";
  return "12";
}

export const ARCHETYPES = {
  anchor: { name: "The Secure Anchor", description: "Your relationship is a rock. You provide stability and safety.", badge: "⚓" },
  awakening: { name: "The Awakening Couple", description: "There’s real potential here. You just need the right tools.", badge: "🌱" },
  warrior: { name: "The Stress Warrior", description: "You handle pressure well together. Crisis mode? You’ve got this.", badge: "🛡️" },
  explorer: { name: "The Passionate Explorer", description: "You thrive on deep connection and growth but sometimes forget to manage stress.", badge: "🔥" },
  guardian: { name: "The Loyal Guardian", description: "You build trust through actions, not words. Your partnership is built on reliability.", badge: "💚" },
  healer: { name: "The Compassionate Healer", description: "You feel deeply but struggle when things get tough.", badge: "💜" },
  fair: { name: "The Fair Partner", description: "Equity matters to you. You track who does what — and that’s not a bad thing.", badge: "⚖️" },
  seeker: { name: "The Growth Seeker", description: "You’re always pushing to be better — individually and together.", badge: "🚀" },
} as const satisfies Record<string, Archetype>;

/** Which dimension drives the archetype: the highest score, ties broken in this order. */
const DOMINANCE_ORDER: QuizDimension[] = ["emotional", "trust", "fairness", "growth", "stress"];

export function getDominantDimension(scores: QuizScores): QuizDimension {
  let best: QuizDimension = DOMINANCE_ORDER[0];
  for (const key of DOMINANCE_ORDER) {
    if (scores[key] > scores[best]) best = key;
  }
  return best;
}

/** The archetype always follows the dominant dimension, so the headline never
 *  contradicts the bars (a 2/10 Growth never yields "The Growth Seeker"). */
export function getArchetype(scores: QuizScores): Archetype {
  const all = QUIZ_DIMENSIONS.map((k) => scores[k]);
  if (all.every((s) => s >= 8)) return ARCHETYPES.anchor;
  if (all.filter((s) => s < 5).length >= 3) return ARCHETYPES.awakening;

  switch (getDominantDimension(scores)) {
    case "stress":
      return ARCHETYPES.warrior;
    case "emotional":
      return scores.stress < 5 ? ARCHETYPES.healer : ARCHETYPES.explorer;
    case "trust":
      return ARCHETYPES.guardian;
    case "fairness":
      return ARCHETYPES.fair;
    case "growth":
      return ARCHETYPES.seeker;
  }
}

/** "I'm The Growth Seeker" — the names carry their own article. */
export function buildQuizShareText(archetype: Archetype, pulse: number, percentile: string): string {
  return `I’m ${archetype.name} — our relationship scored ${pulse}/100, stronger than ${percentile}% of couples. Think you can beat it? 🔥`;
}

/** OG image for a quiz result: pulse + archetype, never fabricated life/rel scores. */
export function buildQuizOgPath(pulse: number, archetypeName: string): string {
  const params = new URLSearchParams({ kind: "quiz", pulse: String(pulse), archetype: archetypeName });
  return `/api/og?${params.toString()}`;
}

/** Register link that carries the encoded quiz answers for onboarding prefill. */
export function quizRegisterHref(encoded: string): string {
  return `/register?quiz=${encodeURIComponent(encoded)}`;
}

// ─── Persistence (viewer-local, best effort) ─────────────────────────

export const QUIZ_STORAGE_KEY = "cm.quizScores";

export interface StoredQuizResult {
  scores: QuizScores;
  pulse: number;
  archetype: string;
  takenAt: string;
}

export function saveQuizScores(values: number[]): StoredQuizResult | null {
  const scores = toQuizScores(values);
  const stored: StoredQuizResult = {
    scores,
    pulse: computePulse(values),
    archetype: getArchetype(scores).name,
    takenAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(stored));
    return stored;
  } catch {
    return null;
  }
}

export function loadQuizScores(): StoredQuizResult | null {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredQuizResult>;
    if (!parsed || typeof parsed !== "object" || !parsed.scores) return null;
    const values = QUIZ_DIMENSIONS.map((k) => Number(parsed.scores?.[k]));
    if (values.some((v) => !Number.isInteger(v) || v < 1 || v > 10)) return null;
    const scores = toQuizScores(values);
    return {
      scores,
      pulse: computePulse(values),
      archetype: getArchetype(scores).name,
      takenAt: typeof parsed.takenAt === "string" ? parsed.takenAt : "",
    };
  } catch {
    return null;
  }
}
