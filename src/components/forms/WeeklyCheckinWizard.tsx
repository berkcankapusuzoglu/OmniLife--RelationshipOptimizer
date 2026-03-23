"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface WeeklyCheckinData {
  satisfaction: {
    vitality: number;
    growth: number;
    security: number;
    connection: number;
    emotional: number;
    trust: number;
    fairness: number;
    stress: number;
    autonomy: number;
  };
  highlight: string;
  gratitude: string;
  frictionDescription: string;
  frictionDimension: string;
  frictionSeverity: string;
  goals: string;
  partnerAppreciation: string;
}

interface WeeklyCheckinWizardProps {
  hasPartner?: boolean;
  onSubmit: (data: WeeklyCheckinData) => void | Promise<void>;
}

const LIFE_AREAS = [
  { key: "vitality", label: "Vitality" },
  { key: "growth", label: "Growth" },
  { key: "security", label: "Security" },
  { key: "connection", label: "Connection" },
  { key: "emotional", label: "Emotional" },
  { key: "trust", label: "Trust" },
  { key: "fairness", label: "Fairness" },
  { key: "stress", label: "Stress Management" },
  { key: "autonomy", label: "Personal Space" },
] as const;

const DIMENSIONS = [
  "emotional",
  "trust",
  "fairness",
  "stress",
  "autonomy",
  "vitality",
  "growth",
  "security",
  "connection",
];

const SEVERITY_OPTIONS = [
  { value: "minor", label: "Minor - small annoyance" },
  { value: "moderate", label: "Moderate - noticeable tension" },
  { value: "significant", label: "Significant - caused conflict" },
  { value: "severe", label: "Severe - ongoing damage" },
];

const STEP_COUNT = 4;

export function WeeklyCheckinWizard({
  hasPartner = false,
  onSubmit,
}: WeeklyCheckinWizardProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [satisfaction, setSatisfaction] = useState<
    Record<string, number>
  >({
    vitality: 5,
    growth: 5,
    security: 5,
    connection: 5,
    emotional: 5,
    trust: 5,
    fairness: 5,
    stress: 5,
    autonomy: 5,
  });
  const [highlight, setHighlight] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [frictionDescription, setFrictionDescription] = useState("");
  const [frictionDimension, setFrictionDimension] = useState("");
  const [frictionSeverity, setFrictionSeverity] = useState("");
  const [goals, setGoals] = useState("");
  const [partnerAppreciation, setPartnerAppreciation] = useState("");

  const handleSatisfactionChange = useCallback(
    (key: string, raw: number | readonly number[]) => {
      const value = Array.isArray(raw) ? raw : [raw as number];
      setSatisfaction((prev) => ({ ...prev, [key]: value[0] }));
    },
    []
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        satisfaction: satisfaction as WeeklyCheckinData["satisfaction"],
        highlight,
        gratitude,
        frictionDescription,
        frictionDimension,
        frictionSeverity,
        goals,
        partnerAppreciation,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 1:
        return true; // sliders always have values
      case 2:
        return true; // optional fields
      case 3:
        return true; // optional fields
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: STEP_COUNT }, (_, i) => {
          const stepNum = i + 1;
          return (
            <div
              key={stepNum}
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                stepNum === step
                  ? "bg-primary text-primary-foreground"
                  : stepNum < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {stepNum}
            </div>
          );
        })}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Step {step} of {STEP_COUNT}
      </p>

      {/* Step 1: Emotional ratings */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>How satisfied are you in each area?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {LIFE_AREAS.map(({ key, label }) => (
              <div key={key} style={{ touchAction: "none" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="font-mono text-sm tabular-nums">
                    {satisfaction[key]}
                  </span>
                </div>
                <Slider
                  value={[satisfaction[key]]}
                  onValueChange={(v) => handleSatisfactionChange(key, v)}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Wins & highlights */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Wins & Highlights</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                What was the highlight of your week?
              </label>
              <Textarea
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                placeholder="A moment, achievement, or experience that stood out..."
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                What are you grateful for?
              </label>
              <Textarea
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="Something or someone you appreciate this week..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Friction & challenges */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Friction & Challenges</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                What friction or challenges did you face?
              </label>
              <Textarea
                value={frictionDescription}
                onChange={(e) => setFrictionDescription(e.target.value)}
                placeholder="Describe any tensions, conflicts, or frustrations..."
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Which dimension was most affected?
              </label>
              <Select
                value={frictionDimension}
                onValueChange={(v) => setFrictionDimension(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a dimension" />
                </SelectTrigger>
                <SelectContent>
                  {DIMENSIONS.map((dim) => (
                    <SelectItem key={dim} value={dim}>
                      {dim.charAt(0).toUpperCase() + dim.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                How severe was it?
              </label>
              <Select
                value={frictionSeverity}
                onValueChange={(v) => setFrictionSeverity(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Next week goals */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Next Week</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                What are your goals for next week?
              </label>
              <Textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="What do you want to focus on or improve..."
                rows={4}
              />
            </div>
            {hasPartner && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Partner appreciation
                </label>
                <Textarea
                  value={partnerAppreciation}
                  onChange={(e) => setPartnerAppreciation(e.target.value)}
                  placeholder="Something you appreciate about your partner this week..."
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3">
        {step > 1 && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep((s) => s - 1)}
          >
            Previous
          </Button>
        )}
        {step < STEP_COUNT ? (
          <Button
            className="flex-1"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext()}
          >
            Next
          </Button>
        ) : (
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Check-in"}
          </Button>
        )}
      </div>
    </div>
  );
}
