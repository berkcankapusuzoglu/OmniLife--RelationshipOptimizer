"use client";

import { useState, useCallback, useEffect } from "react";
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

const DETAILED_STEPS: Step[] = [
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
    label: "Personal Space",
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

const QUICK_STEPS: Step[] = [
  {
    type: "dual",
    id: "mood_energy",
    label: "Mood & Energy",
    description: "How are you feeling today?",
    sliders: [
      { key: "mood", sublabel: "Mood", low: "Low", high: "Great" },
      { key: "energy", sublabel: "Energy", low: "Drained", high: "Energized" },
    ],
  },
  {
    type: "slider",
    id: "connection",
    label: "Connection",
    description: "How connected do you feel to your partner?",
    low: "Distant",
    high: "Deeply connected",
  },
  {
    type: "slider",
    id: "emotional",
    label: "Communication",
    description: "How well are you communicating with each other?",
    low: "Poorly",
    high: "Really well",
  },
  {
    type: "slider",
    id: "trust",
    label: "Trust",
    description: "How much do you trust each other right now?",
    low: "Guarded",
    high: "Completely",
  },
  {
    type: "notes",
    id: "notes",
    label: "Notes",
    description: "Anything on your mind? (optional)",
  },
];

type Mode = "quick" | "detailed";

// Adaptive steps — shown in quick mode when mood drops significantly
const ADAPTIVE_STRESS_STEP: Step = {
  type: "slider",
  id: "stress",
  label: "Stress Management",
  description: "You seem to be having a tough day. How well are you handling stress together?",
  low: "Struggling",
  high: "Managing well",
};

const ADAPTIVE_SECURITY_STEP: Step = {
  type: "slider",
  id: "security",
  label: "Security",
  description: "How secure and stable does your life feel right now?",
  low: "Uncertain",
  high: "Rock solid",
};

// Weekly calibration step — shown once per week to fine-tune derived scores
const CALIBRATION_STEP: Step = {
  type: "calibration" as "dual", // rendered specially, typed as dual for TS compat
  id: "calibration",
  label: "Weekly Fine-tune",
  description: "Quick check — are these estimates still accurate for you?",
  sliders: [
    { key: "growth", sublabel: "Growth", low: "Stagnant", high: "Flourishing" },
    { key: "security", sublabel: "Security", low: "Uncertain", high: "Rock solid" },
    { key: "fairness", sublabel: "Fairness", low: "Very unequal", high: "Balanced" },
    { key: "autonomy", sublabel: "Personal Space", low: "Restricted", high: "Fully free" },
  ],
};

// In Quick mode, derive the missing dimensions from the ones we do ask
function deriveQuickScores(values: Record<string, number | string>) {
  const mood = values.mood as number;
  const energy = values.energy as number;
  const connection = values.connection as number;
  const emotional = values.emotional as number;
  const trust = values.trust as number;

  return {
    vitality: energy,
    growth: values.growth as number,
    security: values.security as number,
    connection,
    emotional,
    trust,
    fairness: values.fairness as number,
    stress: values.stress as number,
    autonomy: values.autonomy as number,
    mood,
    energy,
  };
}

function isCalibrationDue(): boolean {
  if (typeof window === "undefined") return false;
  const last = localStorage.getItem("lastCalibrationDate");
  if (!last) return true;
  const daysSince = Math.floor(
    (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSince >= 7;
}

function markCalibrationDone() {
  localStorage.setItem(
    "lastCalibrationDate",
    new Date().toISOString().split("T")[0]
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DailyLogWizardProps {
  userId: string;
  recentMoodAvg: number | null;
  totalLogs: number;
  calibrationDefaults: {
    growth: number;
    security: number;
    fairness: number;
    autonomy: number;
  } | null;
}

export function DailyLogWizard({
  userId,
  recentMoodAvg,
  totalLogs,
  calibrationDefaults,
}: DailyLogWizardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("dailyLogMode") as Mode) || "quick";
    }
    return "quick";
  });
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Adaptive: track whether mood dropped enough to show extra steps
  const [adaptiveTriggered, setAdaptiveTriggered] = useState(false);

  // Calibration: show once per week after 5+ logs
  const [showCalibration] = useState(
    () => mode === "quick" && totalLogs >= 5 && isCalibrationDue()
  );

  // Build dynamic quick steps based on adaptive + calibration state
  const steps = (() => {
    if (mode === "detailed") return DETAILED_STEPS;
    const base = [...QUICK_STEPS];
    // Insert adaptive steps before notes (last step)
    if (adaptiveTriggered) {
      base.splice(base.length - 1, 0, ADAPTIVE_STRESS_STEP, ADAPTIVE_SECURITY_STEP);
    }
    // Insert calibration before notes
    if (showCalibration) {
      base.splice(base.length - 1, 0, CALIBRATION_STEP);
    }
    return base;
  })();
  const totalSteps = steps.length;

  // All values stored in a flat record — calibration defaults pre-fill derived dims
  const [values, setValues] = useState<Record<string, number | string>>(() => ({
    vitality: 5,
    growth: calibrationDefaults?.growth ?? 5,
    security: calibrationDefaults?.security ?? 5,
    connection: 5,
    emotional: 5,
    trust: 5,
    fairness: calibrationDefaults?.fairness ?? 5,
    stress: 5,
    autonomy: calibrationDefaults?.autonomy ?? 5,
    mood: 5,
    energy: 5,
    notes: "",
  }));

  useEffect(() => {
    localStorage.setItem("dailyLogMode", mode);
  }, [mode]);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setStep(0);
  };

  const currentStep = steps[step];
  const isLast = step === totalSteps - 1;

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

    // Adaptive: if mood drops 2+ below recent average, trigger extra steps
    if (
      key === "mood" &&
      mode === "quick" &&
      !adaptiveTriggered &&
      recentMoodAvg !== null &&
      typeof v === "number" &&
      v <= recentMoodAvg - 2
    ) {
      setAdaptiveTriggered(true);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // In quick mode without adaptive, stress defaults to mood value
      const finalValues = { ...values };
      if (mode === "quick" && !adaptiveTriggered) {
        finalValues.stress = Math.min(10, Math.max(0, finalValues.mood as number));
        finalValues.fairness = Math.round(
          ((finalValues.emotional as number) + (finalValues.trust as number)) / 2
        );
      }
      // If calibration was shown, mark it done
      if (mode === "quick" && showCalibration) {
        markCalibrationDone();
      }
      const scores =
        mode === "quick" ? deriveQuickScores(finalValues) : finalValues;

      const result = await submitDailyLog({
        userId,
        vitality: scores.vitality as number,
        growth: scores.growth as number,
        security: scores.security as number,
        connection: scores.connection as number,
        emotional: scores.emotional as number,
        trust: scores.trust as number,
        fairness: scores.fairness as number,
        stress: scores.stress as number,
        autonomy: scores.autonomy as number,
        mood: scores.mood as number,
        energyLevel: scores.energy as number,
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
        {/* Mode toggle + Progress bar */}
        <div className="mx-auto w-full max-w-lg px-6 pt-6">
          {/* Mode toggle */}
          <div className="mb-4 flex items-center justify-center gap-1 rounded-full bg-muted p-1">
            <button
              onClick={() => switchMode("quick")}
              className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "quick"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Quick (2 min)
            </button>
            <button
              onClick={() => switchMode("detailed")}
              className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "detailed"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Detailed (5 min)
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {step + 1} of {totalSteps}
            </span>
            <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
          </div>
          <Progress value={((step + 1) / totalSteps) * 100} />
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

              {/* Dual slider step (also used for calibration) */}
              {currentStep.type === "dual" && (
                <div className="space-y-10">
                  {currentStep.id === "calibration" && (
                    <p className="text-center text-sm text-muted-foreground">
                      These are estimated from your recent logs. Adjust anything that feels off.
                    </p>
                  )}
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
