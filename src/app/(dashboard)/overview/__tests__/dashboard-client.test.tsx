import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "@/app/(dashboard)/overview/dashboard-client";

/** D-25: "View Today's Log" must open the daily entry, not duplicate "View Insights". */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/charts/InteractiveRadar", () => ({ InteractiveRadar: () => null }));
vi.mock("@/components/charts/TrendSparkline", () => ({ TrendSparkline: () => null }));
vi.mock("@/components/share-score", () => ({ ShareScore: () => null }));

const props = {
  currentScores: {
    pillars: { vitality: 5, growth: 5, security: 5, connection: 5 },
    relDims: { emotional: 5, trust: 5, fairness: 5, stress: 5, autonomy: 5 },
  },
  latestScore: { lifeScore: 50, relScore: 50, totalQuality: 50, penaltyApplied: 0 },
  scoreTrends: [],
  userName: "Test",
  currentStreak: 1,
  longestStreak: 1,
};

beforeEach(() => vi.stubGlobal("React", React));

describe("overview quick actions", () => {
  it("links View Today's Log to /daily when today is logged", () => {
    const html = renderToStaticMarkup(<DashboardClient {...props} hasLoggedToday />);
    const card = html.match(/<a[^>]*href="([^"]+)"[^>]*>(?:(?!<\/a>).)*View Today/);
    expect(card).not.toBeNull();
    expect(card![1]).toBe("/daily");
  });

  it("hides the card before today is logged", () => {
    const html = renderToStaticMarkup(<DashboardClient {...props} hasLoggedToday={false} />);
    expect(html).not.toContain("View Today");
  });
});
