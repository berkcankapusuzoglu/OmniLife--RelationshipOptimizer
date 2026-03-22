"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { MilestoneToast } from "@/components/milestone-toast";
import { submitDailyLog } from "./actions";
import type { Milestone } from "@/lib/milestones";

// ── Step definitions ──────────────────────────────────────────────────────────

interface SliderStep {
  type: "slider";
  id: string;
  label: string;
  description: string;
  low: string;
  high: string;
}

interface DualSliderStep {
  type: "dual";
  id: string;
  label: string;
  description: string;
  sliders: {
    key: string;
    sublabel: string;
    low: string;
    high: string;
  }[];
}

interface NotesStep {
  type: "notes";
  id: string;
  label: string;
  description: string;
}

type Step = SliderStep | DualSliderStep | NotesStep;

const STEPS: Step[] = [
  {
    type: "slider",
    id: "vitality",
    label: "Vitality",
    description: "How vital and energetic do you feel today?",
    low: "Depleted",
    high: "Thriving",
  },
  {
    type: "slider",
    id: "growth",
    label: "Growth",
    description: "How much are you growing and learning right now?",
    low: "Stagnant",
    high: "Flourishing",
  },
  {
    type: "slider",
    id: "security",
    label: "Security",
    description: "How secure and stable does your life feel?",
    low: "Uncertain",
    high: "Rock solid",
  },
  {
    type: "slider",
    id: "connection",
    label: "Connection",
    description: "How connected do you feel to the people around you?",
    low: "Isolated",
    high: "Deeply connected",
  },
  {
    type: "slider",
    id: "emotional",
    label: "Emotional",
    description: "How emotionally connected do you feel to your partner?",
    low: "Distant",
    high: "Deeply connected",
  },
  {
    type: "slider",
    id: "trust",
    label: "Trust",
    description: "How much do you trust your partner right now?",
    low: "Guarded",
    high: "Completely",
  },
  {
    type: "slider",
    id: "fairness",
    label: "Fairness",
    description: "How fairly are responsibilities shared between you?",
    low: "Very unequal",
    high: "Perfectly balanced",
  },
  {
    type: "slider",
    id: "stress",
    label: "Stress Management",
    description: "How well are you handling stress together?",
    low: "Struggling",
    high: "Thriving together",
  },
  {
    type: "slider",
    id: "autonomy",
    label: "Autonomy",
    description: "How much personal freedom do you feel in your relationship?",
    low: "Restricted",
    high: "Fully free",
  },
  {
    type: "dual",
    id: "mood_energy",
    label: "Mood & Energy",
    description: "How's your mood and energy today?",
    sliders: [
      { key: "mood", sublabel: "Mood", low: "Low", high: "Great" },
      { key: "energy", sublabel: "Energy", low: "Drained", high: "Energized" },
    ],
  },
  {
    type: "notes",
    id: "notes",
    label: "Notes",
    description: "Anything you want to note about today?",
  },
];

const TOTAL_STEPS = STEPS.length;

// ── Component ─────────────────────────────────────────────────────────────────

export function DailyLogWizard({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // All values stored in a flat record
  const [values, setValues] = useState<Record<string, number | string>>({
    vitality: 5,
    growth: 5,
    security: 5,
    connection: 5,
    emotional: 5,
    trust: 5,
    fairness: 5,
    stress: 5,
    autonomy: 5,
    mood: 5,
    energy: 5,
    notes: "",
  });

  const currentStep = STEPS[step];
  const isLast = step === TOTAL_STEPS - 1;

  const goTo = useCallback(
    (next: number, dir: "next" | "prev") => {
      if (animating) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setStep(next);
        setAnimating(false);
      }, 250);
    },
    [animating]
  );

  const handleNext = () => {
    if (isLast) {
      handleSubmit();
    } else {
      goTo(step + 1, "next");
    }
  };

  const handleBack = () => {
    if (step > 0) goTo(step - 1, "prev");
  };

  const updateValue = (key: string, val: number | readonly number[]) => {
    const v = Array.isArray(val) ? val[0] : val;
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitDailyLog({
        userId,
        vitality: values.vitality as number,
        growth: values.growth as number,
        security: values.security as number,
        connection: values.connection as number,
        emotional: values.emotional as number,
        trust: values.trust as number,
        fairness: values.fairness as number,
        stress: values.stress as number,
        autonomy: values.autonomy as number,
        mood: values.mood as number,
        energyLevel: values.energy as number,
        notes: (values.notes as string) || "",
      });

      if (result?.milestones?.length) {
        setMilestones(result.milestones);
      }

      setSubmitted(true);
      setTimeout(() => router.push("/overview"), 2000);
    } catch {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <>
        <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
          <div className="w-full max-w-md text-center">
            <div className="mb-6 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-4xl font-bold text-green-500">
                ✓
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight">
              Log submitted!
            </h1>
            <p className="text-muted-foreground">
              Redirecting to your overview...
            </p>
          </div>
        </div>
        {milestones.length > 0 && (
          <MilestoneToast
            milestones={milestones}
            onDismiss={() => setMilestones([])}
          />
        )}
      </>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex min-h-[100dvh] flex-col">
        {/* Progress bar */}
        <div className="mx-auto w-full max-w-lg px-6 pt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {step + 1} of {TOTAL_STEPS}
            </span>
            <span>{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
          </div>
          <Progress value={((step + 1) / TOTAL_STEPS) * 100} />
        </div>

        {/* Question area */}
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-lg">
            <div
              className={`transition-all duration-250 ease-out ${
                animating
                  ? direction === "next"
                    ? "-translate-x-8 opacity-0"
                    : "translate-x-8 opacity-0"
                  : "translate-x-0 opacity-100"
              }`}
            >
              {/* Step label */}
              <div className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                {currentStep.label}
              </div>

              {/* Question */}
              <h2 className="mb-10 text-center text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
                {currentStep.description}
              </h2>

              {/* Slider step */}
              {currentStep.type === "slider" && (
                <SingleSlider
                  value={values[currentStep.id] as number}
                  onChange={(v) => updateValue(currentStep.id, v)}
                  low={currentStep.low}
                  high={currentStep.high}
                />
              )}

              {/* Dual slider step */}
              {currentStep.type === "dual" && (
                <div className="space-y-10">
                  {currentStep.sliders.map((s) => (
                    <div key={s.key}>
                      <div className="mb-4 text-center text-sm font-medium text-muted-foreground">
                        {s.sublabel}
                      </div>
                      <SingleSlider
                        value={values[s.key] as number}
                        onChange={(v) => updateValue(s.key, v)}
                        low={s.low}
                        high={s.high}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Notes step */}
              {currentStep.type === "notes" && (
                <div className="mx-auto max-w-md">
                  <textarea
                    value={values.notes as string}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Optional — jot down anything on your mind..."
                    rows={4}
                    className="w-full resize-none rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-2 text-center text-xs text-muted-foreground/60">
                    You can skip this — just tap Submit below.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-4 px-6 pb-10 pt-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className="min-h-[44px] min-w-[80px]"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={submitting}
            className="min-h-[44px] min-w-[140px] text-base font-semibold"
          >
            {submitting
              ? "Saving..."
              : isLast
                ? "Submit Log"
                : "Next"}
          </Button>
        </div>
      </div>

      {milestones.length > 0 && (
        <MilestoneToast
          milestones={milestones}
          onDismiss={() => setMilestones([])}
        />
      )}
    </>
  );
}

// ── Reusable slider with big number display ───────────────────────────────────

function SingleSlider({
  value,
  onChange,
  low,
  high,
}: {
  value: number;
  onChange: (v: number | readonly number[]) => void;
  low: string;
  high: string;
}) {
  return (
    <div className="mx-auto max-w-md">
      {/* Big number */}
      <div className="mb-8 text-center">
        <span className="text-6xl font-bold tabular-nums text-primary">
          {value}
        </span>
        <span className="text-2xl text-muted-foreground">/10</span>
      </div>

      {/* Slider */}
      <div className="touch-none px-2">
        <Slider
          value={[value]}
          onValueChange={onChange}
          min={0}
          max={10}
          step={1}
        />
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>{low}</span>
          <span>{high}</span>
        </div>
      </div>
    </div>
  );
}
