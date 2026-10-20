import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareableScoreCard } from "@/components/score-card";
import { ShareScore, buildShareText, buildShareUrl, formatLocalDate } from "@/components/share-score";
import { ResultClient } from "@/app/(public)/quiz/result/result-client";
import { QuizClient } from "@/app/(public)/quiz/quiz-client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/newsletter-signup", () => ({ NewsletterSignup: () => null }));

const effects: Array<() => void | (() => void)> = [];
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useEffect: (effect: () => void | (() => void)) => { effects.push(effect); } };
});

const html = (node: React.ReactNode) => renderToStaticMarkup(node);
const text = (markup: string) => markup.replace(/<[^>]*>/g, " ");

const scoreProps = {
  totalQuality: 72,
  lifeScore: 70,
  relScore: 81,
  date: "2026-10-19",
  pillars: { vitality: 7, growth: 6, security: 8, connection: 7 },
  relDims: { emotional: 8, trust: 9, fairness: 7, stress: 4, autonomy: 7 },
};

beforeEach(() => { effects.length = 0; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("ShareableScoreCard (D-07, D-08)", () => {
  it("no longer forces a square, overflow-clipped box around the radar", () => {
    const markup = html(React.createElement(ShareableScoreCard, scoreProps));
    expect(markup).not.toContain("aspect-square");
    expect(markup).toMatch(/<svg[^>]*overflow="visible"/);
  });

  it("is branded Couplemetric with the configured site host, not omnilife.app", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://couplemetric.example");
    const markup = html(React.createElement(ShareableScoreCard, scoreProps));
    expect(markup).toContain("Couplemetric");
    expect(markup).toContain("couplemetric.example");
    expect(markup).not.toContain("omnilife.app");
    expect(markup).not.toMatch(/>O<\/span>/);
  });
});

describe("ShareScore (D-22, D-23)", () => {
  it("leads the share text with the Relationship score", () => {
    expect(buildShareText({ relScore: 81, streak: 3 })).toContain("scored 81/100");
    expect(buildShareText({ relScore: 81 })).not.toContain("72");
  });

  it("formats the viewer's local date, not UTC", () => {
    const late = new Date(2026, 9, 19, 23, 30); // local 2026-10-19 23:30
    expect(formatLocalDate(late)).toBe("2026-10-19");
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("puts the local date into the share URL", () => {
    vi.stubGlobal("window", { location: { origin: "https://couplemetric.test" } });
    const url = new URL(buildShareUrl(scoreProps, "2026-10-19"));
    expect(url.origin).toBe("https://couplemetric.test");
    expect(url.searchParams.get("date")).toBe("2026-10-19");
    expect(url.searchParams.get("rel")).toBe("81");
  });

  it("renders without a toast until a share result arrives", () => {
    const markup = html(React.createElement(ShareScore, scoreProps));
    expect(markup).toContain("Share Score");
    expect(markup).not.toContain('role="status"');
  });
});

describe("quiz ResultClient (D-34, D-49, D-50, D-52)", () => {
  const dims = [
    { key: "emotional" as const, label: "Emotional", value: 8 },
    { key: "fairness" as const, label: "Fairness", value: 1 },
    { key: "trust" as const, label: "Trust", value: 7 },
    { key: "growth" as const, label: "Growth", value: 2 },
    { key: "stress" as const, label: "Stress", value: 9 },
  ];
  const props = { pulse: 54, interpretation: "Developing", dimensions: dims, shareParam: "OCwxLDcsMiw5" };

  it("shows an archetype consistent with the dominant dimension", () => {
    const markup = html(React.createElement(ResultClient, props));
    expect(markup).toContain("The Stress Warrior");
    expect(markup).not.toContain("The Growth Seeker");
  });

  it("renders the radar with visible overflow and a labelled viewBox margin", () => {
    const markup = html(React.createElement(ResultClient, props));
    expect(markup).toMatch(/<svg[^>]*overflow="visible"/);
    expect(markup).toContain(">Fairness</text>");
    expect(markup).toContain(">Stress</text>");
  });

  it("links to /register with the encoded answers", () => {
    const markup = html(React.createElement(ResultClient, props));
    expect(markup).toContain('href="/register?quiz=OCwxLDcsMiw5"');
  });

  it("persists the answers to localStorage on mount", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
    });
    html(React.createElement(ResultClient, props));
    effects.forEach((effect) => effect());
    const saved = JSON.parse(store.get("cm.quizScores") ?? "null");
    expect(saved?.scores).toEqual({ emotional: 8, fairness: 1, trust: 7, growth: 2, stress: 9 });
    expect(saved?.archetype).toBe("The Stress Warrior");
  });
});

describe("QuizClient (D-35, D-51)", () => {
  it("starts on an intro screen with one Start control and no Back", () => {
    const markup = html(React.createElement(QuizClient));
    expect(text(markup)).toContain("Start Quiz");
    expect(text(markup)).not.toMatch(/\bBack\b/);
  });
});
