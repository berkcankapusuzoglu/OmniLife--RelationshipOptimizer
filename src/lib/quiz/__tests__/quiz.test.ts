import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ARCHETYPES,
  QUIZ_STORAGE_KEY,
  buildQuizOgPath,
  buildQuizShareText,
  computePulse,
  decodeQuizScores,
  encodeQuizScores,
  getArchetype,
  getDominantDimension,
  getPercentile,
  loadQuizScores,
  quizRegisterHref,
  saveQuizScores,
  toQuizScores,
} from "..";

describe("quiz encoding", () => {
  it("round-trips five answers", () => {
    const encoded = encodeQuizScores([8, 1, 7, 2, 9]);
    expect(encoded).toBe("OCwxLDcsMiw5");
    expect(decodeQuizScores(encoded)).toEqual([8, 1, 7, 2, 9]);
  });

  it("rejects malformed or out-of-range input", () => {
    expect(decodeQuizScores("not base64!")).toBeNull();
    expect(decodeQuizScores(encodeQuizScores([8, 1, 7, 2]))).toBeNull();
    expect(decodeQuizScores(encodeQuizScores([8, 1, 7, 2, 11]))).toBeNull();
    expect(decodeQuizScores(encodeQuizScores([8, 1, 7, 2, 0]))).toBeNull();
  });

  it("computes the pulse and percentile", () => {
    expect(computePulse([5, 5, 5, 5, 5])).toBe(50);
    expect(computePulse([8, 1, 7, 2, 9])).toBe(54);
    expect(getPercentile(54)).toBe("47");
    expect(getPercentile(96)).toBe("99");
  });
});

describe("getArchetype", () => {
  it("never names a dimension that is not the dominant one (D-50)", () => {
    // Growth 2/10 must not produce "The Growth Seeker".
    const scores = toQuizScores([8, 1, 7, 2, 9]);
    const archetype = getArchetype(scores);
    expect(archetype.name).not.toBe(ARCHETYPES.seeker.name);
    expect(getDominantDimension(scores)).toBe("stress");
    expect(archetype).toBe(ARCHETYPES.warrior);
  });

  it("follows the dominant dimension", () => {
    expect(getArchetype(toQuizScores([5, 5, 5, 9, 5]))).toBe(ARCHETYPES.seeker);
    expect(getArchetype(toQuizScores([5, 9, 6, 5, 5]))).toBe(ARCHETYPES.fair);
    expect(getArchetype(toQuizScores([5, 5, 9, 5, 5]))).toBe(ARCHETYPES.guardian);
    expect(getArchetype(toQuizScores([9, 5, 5, 7, 7]))).toBe(ARCHETYPES.explorer);
    expect(getArchetype(toQuizScores([9, 6, 6, 7, 3]))).toBe(ARCHETYPES.healer);
  });

  it("keeps the all-high and mostly-low special cases", () => {
    expect(getArchetype(toQuizScores([8, 9, 8, 10, 8]))).toBe(ARCHETYPES.anchor);
    expect(getArchetype(toQuizScores([2, 3, 4, 6, 7]))).toBe(ARCHETYPES.awakening);
  });
});

describe("share text and links", () => {
  it("uses the archetype name without a doubled article (D-49)", () => {
    const text = buildQuizShareText(ARCHETYPES.seeker, 72, "65");
    expect(text).toContain("I’m The Growth Seeker");
    expect(text).not.toMatch(/a The/);
    expect(text).toContain("72/100");
  });

  it("builds a quiz OG path with the archetype and no life/rel scores (D-08)", () => {
    const path = buildQuizOgPath(54, "The Stress Warrior");
    expect(path).toBe("/api/og?kind=quiz&pulse=54&archetype=The+Stress+Warrior");
    expect(path).not.toMatch(/life=|rel=/);
  });

  it("carries the encoded answers to /register (D-52)", () => {
    expect(quizRegisterHref("OCwxLDcsMiw5")).toBe("/register?quiz=OCwxLDcsMiw5");
  });
});

describe("quiz persistence", () => {
  const store = new Map<string, string>();
  afterEach(() => { store.clear(); vi.unstubAllGlobals(); });

  it("saves and loads the answers from localStorage (D-52)", () => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
    });
    const saved = saveQuizScores([8, 1, 7, 2, 9]);
    expect(saved?.pulse).toBe(54);
    expect(store.has(QUIZ_STORAGE_KEY)).toBe(true);
    const loaded = loadQuizScores();
    expect(loaded?.scores).toEqual({ emotional: 8, fairness: 1, trust: 7, growth: 2, stress: 9 });
    expect(loaded?.archetype).toBe("The Stress Warrior");
  });

  it("fails soft when storage is blocked or corrupt", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "{not json",
      setItem: () => { throw new Error("blocked"); },
    });
    expect(saveQuizScores([5, 5, 5, 5, 5])).toBeNull();
    expect(loadQuizScores()).toBeNull();
  });
});
