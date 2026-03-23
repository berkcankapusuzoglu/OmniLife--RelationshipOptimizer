"use client";

import { useMemo, useRef } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import type { PillarScores, RelDimScores } from "@/lib/engine/types";
import { useRadarDrag } from "@/hooks/use-radar-drag";

interface Scores {
  pillars: PillarScores;
  relDims: RelDimScores;
}

interface InteractiveRadarProps {
  currentScores: Scores;
  targetScores?: Scores;
  onScoreChange?: (dimension: string, value: number) => void;
  interactive?: boolean;
}

const PILLAR_KEYS = ["vitality", "growth", "security", "connection"] as const;
const REL_DIM_KEYS = [
  "emotional",
  "trust",
  "fairness",
  "stress",
  "autonomy",
] as const;

const DIMENSION_LABELS: Record<string, string> = {
  vitality: "Vitality",
  growth: "Growth",
  security: "Security",
  connection: "Connection",
  emotional: "Emotional",
  trust: "Trust",
  fairness: "Fairness",
  stress: "Stress",
  autonomy: "Personal Space",
};

function buildData(current: Scores, target?: Scores) {
  const items: {
    dimension: string;
    label: string;
    current: number;
    target: number;
    fullMark: number;
    isPillar: boolean;
  }[] = [];

  for (const key of PILLAR_KEYS) {
    items.push({
      dimension: key,
      label: DIMENSION_LABELS[key],
      current: current.pillars[key],
      target: target?.pillars[key] ?? current.pillars[key],
      fullMark: 10,
      isPillar: true,
    });
  }

  for (const key of REL_DIM_KEYS) {
    items.push({
      dimension: key,
      label: DIMENSION_LABELS[key],
      current: current.relDims[key],
      target: target?.relDims[key] ?? current.relDims[key],
      fullMark: 10,
      isPillar: false,
    });
  }

  return items;
}

export function InteractiveRadar({
  currentScores,
  targetScores,
  onScoreChange,
  interactive = false,
}: InteractiveRadarProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const data = useMemo(
    () => buildData(currentScores, targetScores),
    [currentScores, targetScores]
  );

  const dimensionNames = useMemo(() => data.map((d) => d.dimension), [data]);

  const dragHandlers = useRadarDrag({
    svgRef,
    center: { x: 200, y: 200 },
    radius: 140,
    dimensions: dimensionNames,
    onValueChange: onScoreChange ?? (() => {}),
  });

  const renderCustomLabel = (props: Record<string, unknown>) => {
    const x = props.x as number;
    const y = props.y as number;
    const payload = props.payload as { value: string };
    const item = data.find((d) => d.label === payload.value);
    const isPillar = item?.isPillar ?? true;

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        className={`text-[11px] font-medium ${
          isPillar
            ? "fill-indigo-400"
            : "fill-rose-400"
        }`}
      >
        {payload.value}
      </text>
    );
  };

  return (
    <div className="w-full max-w-[500px] mx-auto" style={{ minHeight: 300 }}>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius="70%"
          data={data}
          ref={(el: SVGSVGElement | null) => {
            if (el) svgRef.current = el;
          }}
        >
          <PolarGrid
            stroke="oklch(0.5 0 0 / 0.2)"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="label"
            tick={renderCustomLabel}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fontSize: 10, fill: "oklch(0.6 0 0)" }}
            tickCount={6}
          />

          {/* Current scores - filled area */}
          <Radar
            name="Current"
            dataKey="current"
            stroke="oklch(0.65 0.2 265)"
            fill="oklch(0.55 0.2 265 / 0.25)"
            strokeWidth={2}
          />

          {/* Target scores - dashed outline */}
          {targetScores && (
            <Radar
              name="Target"
              dataKey="target"
              stroke="oklch(0.75 0.15 265 / 0.6)"
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          )}

          {/* Interactive drag overlay */}
          {interactive && onScoreChange && (
            <g
              {...dragHandlers}
              style={{ cursor: "crosshair" }}
            >
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="transparent"
              />
            </g>
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
