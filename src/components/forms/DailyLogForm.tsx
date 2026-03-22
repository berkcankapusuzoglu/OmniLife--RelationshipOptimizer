"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface DailyLogData {
  pillar: {
    vitality: number;
    growth: number;
    security: number;
    connection: number;
  };
  rel: {
    emotional: number;
    trust: number;
    fairness: number;
    stress: number;
    autonomy: number;
  };
  mood: number;
  energy: number;
  notes: string;
}

interface DailyLogFormProps {
  onSubmit: (data: DailyLogData) => void | Promise<void>;
}

const PILLAR_ITEMS = [
  { key: "vitality" as const, label: "Vitality" },
  { key: "growth" as const, label: "Growth" },
  { key: "security" as const, label: "Security" },
  { key: "connection" as const, label: "Connection" },
];

const REL_ITEMS = [
  { key: "emotional" as const, label: "Emotional" },
  { key: "trust" as const, label: "Trust" },
  { key: "fairness" as const, label: "Fairness" },
  { key: "stress" as const, label: "Stress Mgmt" },
  { key: "autonomy" as const, label: "Autonomy" },
];

const MOODS = [
  { value: 1, emoji: "\u{1F62B}", label: "Awful" },
  { value: 2, emoji: "\u{1F615}", label: "Bad" },
  { value: 3, emoji: "\u{1F610}", label: "Okay" },
  { value: 4, emoji: "\u{1F642}", label: "Good" },
  { value: 5, emoji: "\u{1F60A}", label: "Great" },
];

const ENERGY_LEVELS = [
  { value: 1, label: "Drained" },
  { value: 2, label: "Low" },
  { value: 3, label: "Normal" },
  { value: 4, label: "High" },
  { value: 5, label: "Energized" },
];

export function DailyLogForm({ onSubmit }: DailyLogFormProps) {
  const [pillar, setPillar] = useState({
    vitality: 5,
    growth: 5,
    security: 5,
    connection: 5,
  });
  const [rel, setRel] = useState({
    emotional: 5,
    trust: 5,
    fairness: 5,
    stress: 5,
    autonomy: 5,
  });
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePillarChange = useCallback(
    (key: keyof typeof pillar, raw: number | readonly number[]) => {
      const value = Array.isArray(raw) ? raw : [raw as number];
      setPillar((prev) => ({ ...prev, [key]: value[0] }));
    },
    []
  );

  const handleRelChange = useCallback(
    (key: keyof typeof rel, raw: number | readonly number[]) => {
      const value = Array.isArray(raw) ? raw : [raw as number];
      setRel((prev) => ({ ...prev, [key]: value[0] }));
    },
    []
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ pillar, rel, mood, energy, notes });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Life Pillars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-400">Life Pillars</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {PILLAR_ITEMS.map(({ key, label }) => (
            <div key={key} style={{ touchAction: "none" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-blue-300/80">{label}</span>
                <span className="font-mono text-sm tabular-nums">
                  {pillar[key]}
                </span>
              </div>
              <Slider
                value={[pillar[key]]}
                onValueChange={(v) => handlePillarChange(key, v)}
                min={0}
                max={10}
                step={1}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Relationship Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-rose-400">Relationship</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {REL_ITEMS.map(({ key, label }) => (
            <div key={key} style={{ touchAction: "none" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-rose-300/80">{label}</span>
                <span className="font-mono text-sm tabular-nums">
                  {rel[key]}
                </span>
              </div>
              <Slider
                value={[rel[key]]}
                onValueChange={(v) => handleRelChange(key, v)}
                min={0}
                max={10}
                step={1}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Mood picker */}
      <Card>
        <CardHeader>
          <CardTitle>Mood</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood(m.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg p-2 text-2xl transition-all",
                  "min-w-[3rem] active:scale-95",
                  mood === m.value
                    ? "bg-primary/15 ring-2 ring-primary"
                    : "hover:bg-muted"
                )}
              >
                <span>{m.emoji}</span>
                <span className="text-[10px] text-muted-foreground">
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Energy level */}
      <Card>
        <CardHeader>
          <CardTitle>Energy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-1">
            {ENERGY_LEVELS.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => setEnergy(e.value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-sm font-medium transition-all",
                  "active:scale-95",
                  energy === e.value
                    ? "bg-primary/15 text-primary ring-2 ring-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="text-lg font-bold">{e.value}</span>
                <span className="text-[10px]">{e.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything on your mind today..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Saving..." : "Log Today"}
      </Button>
    </div>
  );
}
