"use client";

import { useCallback } from "react";
import type { Weights, PillarWeights, RelWeights } from "@/lib/engine/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

interface WeightSlidersProps {
  weights: Weights;
  onChange: (weights: Weights) => void;
  currentScores?: {
    lifeScore: number;
    relScore: number;
    totalQuality: number;
  };
}

const PILLAR_LABELS: Record<keyof PillarWeights, string> = {
  vitality: "Vitality",
  growth: "Growth",
  security: "Security",
  connection: "Connection",
};

const REL_LABELS: Record<keyof RelWeights, string> = {
  emotional: "Emotional",
  trust: "Trust",
  fairness: "Fairness",
  stress: "Stress Mgmt",
  autonomy: "Personal Space",
};

function toNumberArray(value: number | readonly number[]): number[] {
  return Array.isArray(value) ? value : [value as number];
}

function normalizeWeights<T extends Record<string, number>>(
  weights: T,
  changedKey: keyof T,
  newValue: number
): T {
  const keys = Object.keys(weights) as (keyof T)[];
  const otherKeys = keys.filter((k) => k !== changedKey);
  const remaining = 1 - newValue;
  const otherSum = otherKeys.reduce(
    (sum, k) => sum + (weights[k] as number),
    0
  );

  const result: Record<string, number> = { ...weights, [changedKey]: newValue };

  if (otherSum === 0) {
    const equalShare = remaining / otherKeys.length;
    for (const k of otherKeys) {
      result[k as string] = equalShare;
    }
  } else {
    const scale = remaining / otherSum;
    for (const k of otherKeys) {
      result[k as string] = (weights[k] as number) * scale;
    }
  }

  return result as T;
}

export function WeightSliders({
  weights,
  onChange,
  currentScores,
}: WeightSlidersProps) {
  const handleAlphaChange = useCallback(
    (raw: number | readonly number[]) => {
      const value = toNumberArray(raw);
      const alpha = value[0] / 100;
      onChange({
        ...weights,
        alpha,
        beta: 1 - alpha,
      });
    },
    [weights, onChange]
  );

  const handlePillarChange = useCallback(
    (key: keyof PillarWeights, raw: number | readonly number[]) => {
      const value = toNumberArray(raw);
      const newValue = value[0] / 100;
      const normalized = normalizeWeights(weights.pillar as unknown as Record<string, number>, key as string, newValue) as unknown as PillarWeights;
      onChange({ ...weights, pillar: normalized });
    },
    [weights, onChange]
  );

  const handleRelChange = useCallback(
    (key: keyof RelWeights, raw: number | readonly number[]) => {
      const value = toNumberArray(raw);
      const newValue = value[0] / 100;
      const normalized = normalizeWeights(weights.rel as unknown as Record<string, number>, key as string, newValue) as unknown as RelWeights;
      onChange({ ...weights, rel: normalized });
    },
    [weights, onChange]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Alpha / Beta balance */}
      <Card>
        <CardHeader>
          <CardTitle>Life / Relationship Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Life (alpha)</span>
            <span>Relationship (beta)</span>
          </div>
          <div style={{ touchAction: "none" }}>
          <Slider
            value={[Math.round(weights.alpha * 100)]}
            onValueChange={handleAlphaChange}
            min={0}
            max={100}
            step={1}
            className="my-3"
          />
          </div>
          <div className="flex items-center justify-between font-mono text-sm">
            <span>{weights.alpha.toFixed(2)}</span>
            <span>{weights.beta.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Life pillar weights */}
      <Card>
        <CardHeader>
          <CardTitle>Life Pillar Weights</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(Object.keys(PILLAR_LABELS) as (keyof PillarWeights)[]).map(
            (key) => (
              <div key={key} style={{ touchAction: "none" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    {PILLAR_LABELS[key]}
                  </span>
                  <span className="font-mono text-sm">
                    {weights.pillar[key].toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[Math.round(weights.pillar[key] * 100)]}
                  onValueChange={(v) => handlePillarChange(key, v)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            )
          )}
          <Separator />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total</span>
            <span className="font-mono">
              {Object.values(weights.pillar)
                .reduce((a, b) => a + b, 0)
                .toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Relationship dimension weights */}
      <Card>
        <CardHeader>
          <CardTitle>Relationship Dimension Weights</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(Object.keys(REL_LABELS) as (keyof RelWeights)[]).map((key) => (
            <div key={key} style={{ touchAction: "none" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  {REL_LABELS[key]}
                </span>
                <span className="font-mono text-sm">
                  {weights.rel[key].toFixed(2)}
                </span>
              </div>
              <Slider
                value={[Math.round(weights.rel[key] * 100)]}
                onValueChange={(v) => handleRelChange(key, v)}
                min={0}
                max={100}
                step={1}
              />
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total</span>
            <span className="font-mono">
              {Object.values(weights.rel)
                .reduce((a, b) => a + b, 0)
                .toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Score preview */}
      {currentScores && (
        <Card>
          <CardHeader>
            <CardTitle>Score Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Life</p>
                <p className="font-mono text-lg font-semibold">
                  {currentScores.lifeScore.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Relationship</p>
                <p className="font-mono text-lg font-semibold">
                  {currentScores.relScore.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-mono text-lg font-bold text-primary">
                  {currentScores.totalQuality.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
