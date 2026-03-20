"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";

interface HistoricalPoint {
  lifeScore: number;
  relScore: number;
  date: string;
}

interface FrontierPoint {
  lifeScore: number;
  relScore: number;
}

interface ParetoChartProps {
  historicalPoints: HistoricalPoint[];
  frontierPoints: FrontierPoint[];
  currentPoint: { lifeScore: number; relScore: number };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: HistoricalPoint | FrontierPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground ring-1 ring-foreground/10 shadow-md">
      {"date" in data && (
        <p className="mb-1 text-muted-foreground">{data.date}</p>
      )}
      <p>Life: {data.lifeScore.toFixed(1)}</p>
      <p>Relationship: {data.relScore.toFixed(1)}</p>
    </div>
  );
}

export function ParetoChart({
  historicalPoints,
  frontierPoints,
  currentPoint,
}: ParetoChartProps) {
  // Sort frontier points by lifeScore for a clean line
  const sortedFrontier = [...frontierPoints].sort(
    (a, b) => a.lifeScore - b.lifeScore
  );

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(0.5 0 0 / 0.15)"
          />
          <XAxis
            type="number"
            dataKey="lifeScore"
            domain={[0, 100]}
            name="Life Score"
            tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }}
            label={{
              value: "Life Score",
              position: "bottom",
              offset: 0,
              style: { fontSize: 12, fill: "oklch(0.6 0 0)" },
            }}
          />
          <YAxis
            type="number"
            dataKey="relScore"
            domain={[0, 100]}
            name="Rel. Score"
            tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }}
            label={{
              value: "Relationship Score",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fontSize: 12, fill: "oklch(0.6 0 0)" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Historical points - muted dots */}
          <Scatter
            data={historicalPoints}
            fill="oklch(0.6 0.05 265 / 0.35)"
            stroke="oklch(0.6 0.05 265 / 0.5)"
            strokeWidth={1}
            r={3}
          />

          {/* Pareto frontier line */}
          <Line
            data={sortedFrontier}
            type="monotone"
            dataKey="relScore"
            stroke="oklch(0.75 0.18 145)"
            strokeWidth={2}
            dot={false}
            legendType="none"
          />

          {/* Current position - highlighted */}
          <Scatter
            data={[currentPoint]}
            fill="oklch(0.7 0.25 30)"
            stroke="oklch(0.85 0.2 30)"
            strokeWidth={2}
            r={6}
            shape="diamond"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
