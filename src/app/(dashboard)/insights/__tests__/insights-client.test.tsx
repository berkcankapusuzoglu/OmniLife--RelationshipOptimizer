import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InsightsClient } from "@/app/(dashboard)/insights/insights-client";

/**
 * D-26: a logged day where no rule fires must not dead-end on
 * "Log your daily scores..." — the Recommendations tab always offers a next step.
 */

vi.mock("@/components/charts/ParetoChart", () => ({ ParetoChart: () => null }));
vi.mock("recharts", () => {
  const Noop = () => null;
  return {
    LineChart: Noop, Line: Noop, XAxis: Noop, YAxis: Noop, CartesianGrid: Noop,
    Tooltip: Noop, ResponsiveContainer: Noop, Legend: Noop,
  };
});

const base = {
  historicalPoints: [],
  frontierPoints: [],
  currentPoint: { lifeScore: 50, relScore: 50 },
  trendData: [],
  userTier: "premium",
};
const balanced = {
  vitality: 5, growth: 5, security: 5, connection: 5,
  emotional: 5, trust: 5, fairness: 5, stress: 5, autonomy: 5,
};

beforeEach(() => vi.stubGlobal("React", React));

describe("Recommendations tab", () => {
  it("shows a maintenance card with a next action when a log exists but no rule fires", () => {
    const html = renderToStaticMarkup(
      <InsightsClient {...base} recommendations={[]} currentDimScores={{ ...balanced, trust: 4 }} />,
    );
    expect(html).toContain('data-testid="balanced-recommendation"');
    expect(html).not.toContain("Log your daily scores to get personalized recommendations.");
    expect(html).toContain('href="/exercises"');
    expect(html).toContain('href="/daily"');
    // Weakest dimension is called out with its tip
    expect(html).toMatch(/Easiest win:.*trust.*4\.0\/10/);
  });

  it("treats high stress as the weakest dimension", () => {
    const html = renderToStaticMarkup(
      <InsightsClient {...base} recommendations={[]} currentDimScores={{ ...balanced, stress: 8 }} />,
    );
    expect(html).toMatch(/Easiest win:.*stress.*8\.0\/10/);
  });

  it("keeps the log prompt only when there is no log at all", () => {
    const html = renderToStaticMarkup(
      <InsightsClient {...base} currentPoint={null} recommendations={[]} />,
    );
    expect(html).toContain("Log your daily scores to get personalized recommendations.");
    expect(html).not.toContain('data-testid="balanced-recommendation"');
  });

  it("renders real recommendations ahead of the fallback", () => {
    const html = renderToStaticMarkup(
      <InsightsClient
        {...base}
        currentDimScores={balanced}
        recommendations={[{
          id: "rec-001", type: "improvement", title: "High stress detected", description: "d",
          theoryBasis: "t", targetDimension: "stress", priority: 5,
        }]}
      />,
    );
    expect(html).toContain("High stress detected");
    expect(html).not.toContain('data-testid="balanced-recommendation"');
  });
});
