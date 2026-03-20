"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

interface TrendSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  showDot?: boolean;
}

export function TrendSparkline({
  data,
  color = "oklch(0.65 0.2 265)",
  height = 40,
  showDot = false,
}: TrendSparklineProps) {
  if (data.length === 0) return null;

  const chartData = data.map((value, index) => ({ index, value }));
  const trend = data.length >= 2 ? data[data.length - 1] - data[0] : 0;

  return (
    <div className="inline-flex items-center gap-1.5">
      <div style={{ width: height * 2.5, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={
                showDot
                  ? (props: Record<string, unknown>) => {
                      const cx = props.cx as number | undefined;
                      const cy = props.cy as number | undefined;
                      const index = props.index as number;
                      if (index !== chartData.length - 1) return <g key={index} />;
                      return (
                        <circle
                          key={index}
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill={color}
                          stroke="none"
                        />
                      );
                    }
                  : false
              }
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {data.length >= 2 && (
        <span
          className={`text-xs font-medium ${
            trend > 0
              ? "text-emerald-400"
              : trend < 0
                ? "text-red-400"
                : "text-muted-foreground"
          }`}
          aria-label={trend > 0 ? "Trending up" : trend < 0 ? "Trending down" : "No change"}
        >
          {trend > 0 ? "\u2191" : trend < 0 ? "\u2193" : "\u2192"}
        </span>
      )}
    </div>
  );
}
