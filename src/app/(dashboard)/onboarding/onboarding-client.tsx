"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Heart,
  Target,
  Sliders,
  Layers,
  Shield,
  UserPlus,
} from "lucide-react";
import { completeOnboarding } from "./actions";
import type { OnboardingData } from "./actions";
import { CONSTRAINT_NAME_MAX } from "@/lib/auth/action-inputs";
import { loadQuizScores } from "@/lib/quiz";
import { applyQuizPrefill } from "@/lib/quiz/prefill";

interface ScenarioPresetData {
  id: string;
  name: string;
  mode: string;
  description: string;
}

interface OnboardingClientProps {
  scenarioPresets: ScenarioPresetData[];
  /** Initial wizard step (0-based). Used by tests to render a specific step. */
  initialStep?: number;
  /** Open the "Add a Constraint" form on first render. Used by tests. */
  initialShowConstraintForm?: boolean;
}

type ConstraintType = "time_budget" | "energy_budget" | "redline";

interface DraftConstraint {
  name: string;
  type: ConstraintType;
  dimension: string;
  minValue?: number;
  maxValue?: number;
  budgetHours?: number;
}

interface OnboardingDraft {
  step: number;
  relationshipStatus: string;
  goals: string[];
  dimensionScores: Record<string, number>;
  scenarioMode: string;
  constraints: DraftConstraint[];
  partnerEmail: string;
}

/** localStorage key for the in-progress onboarding wizard (D-17). */
export const ONBOARDING_DRAFT_KEY = "onboardingDraft";

const RELATIONSHIP_STATUSES = [
  "In a relationship",
  "Married",
  "Engaged",
  "Dating",
  "Long-distance",
  "It's complicated",
  "Other",
];

const GOAL_OPTIONS = [
  "Improve communication",
  "Build trust",
  "Increase emotional intimacy",
  "Better conflict resolution",
  "More quality time together",
  "Work-life balance",
  "Personal growth alongside partner",
  "Reduce stress in the relationship",
  "Strengthen autonomy",
];

const DIMENSION_LABELS: Record<string, { label: string; description: string }> = {
  vitality: {
    label: "Vitality",
    description: "Physical health, exercise, sleep, and energy levels",
  },
  growth: {
    label: "Growth",
    description: "Learning, career development, and personal goals",
  },
  security: {
    label: "Security",
    description: "Financial stability, safety, and peace of mind",
  },
  connection: {
    label: "Connection",
    description: "Social bonds, community, and sense of belonging",
  },
  emotional: {
    label: "Emotional",
    description: "Emotional well-being and intimacy in your relationship",
  },
  trust: {
    label: "Trust",
    description: "Honesty, reliability, and faith in your partner",
  },
  fairness: {
    label: "Fairness",
    description: "Balance of effort, chores, and responsibilities",
  },
  stress: {
    label: "Stress Level",
    description: "Current stress and conflict (lower is better)",
  },
  autonomy: {
    label: "Personal Space",
    description: "Personal space, independence, and individual identity",
  },
};

const DIMENSION_KEYS = [
  "vitality",
  "growth",
  "security",
  "connection",
  "emotional",
  "trust",
  "fairness",
  "stress",
  "autonomy",
] as const;

const CONSTRAINT_DIMENSIONS = [
  "vitality",
  "growth",
  "security",
  "connection",
  "emotional",
  "trust",
  "fairness",
  "stress",
  "autonomy",
];

const CONSTRAINT_TYPES: ConstraintType[] = ["redline", "time_budget", "energy_budget"];

const STEPS = [
  { title: "Goals", icon: Target },
  { title: "Self-Assessment", icon: Sliders },
  { title: "Scenario", icon: Layers },
  { title: "Constraints", icon: Shield },
  { title: "Partner", icon: UserPlus },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_CONSTRAINT = {
  name: "",
  type: "redline" as ConstraintType,
  dimension: "vitality",
  minValue: "",
  maxValue: "",
  budgetHours: "",
};

function defaultScores(): Record<string, number> {
  return Object.fromEntries(DIMENSION_KEYS.map((k) => [k, 5]));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseBounded(raw: string, min: number, max: number): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return clampInt(n, min, max);
}

function readDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (!d || typeof d !== "object") return null;
    const scores = defaultScores();
    for (const key of DIMENSION_KEYS) {
      const v = d.dimensionScores?.[key];
      if (typeof v === "number" && Number.isFinite(v)) scores[key] = clampInt(v, 1, 10);
    }
    return {
      step: typeof d.step === "number" ? clampInt(d.step, 0, STEPS.length - 1) : 0,
      relationshipStatus:
        typeof d.relationshipStatus === "string" && RELATIONSHIP_STATUSES.includes(d.relationshipStatus)
          ? d.relationshipStatus
          : "",
      goals: Array.isArray(d.goals) ? d.goals.filter((g): g is string => typeof g === "string" && GOAL_OPTIONS.includes(g)) : [],
      dimensionScores: scores,
      scenarioMode: typeof d.scenarioMode === "string" ? d.scenarioMode : "default",
      constraints: Array.isArray(d.constraints)
        ? d.constraints
            .filter((c): c is DraftConstraint => !!c && typeof c === "object" && typeof c.name === "string" && CONSTRAINT_TYPES.includes(c.type) && CONSTRAINT_DIMENSIONS.includes(c.dimension))
            .map((c) => ({
              name: c.name.slice(0, CONSTRAINT_NAME_MAX),
              type: c.type,
              dimension: c.dimension,
              minValue: typeof c.minValue === "number" ? clampInt(c.minValue, 0, 10) : undefined,
              maxValue: typeof c.maxValue === "number" ? clampInt(c.maxValue, 0, 10) : undefined,
              budgetHours: typeof c.budgetHours === "number" ? clampInt(c.budgetHours, 0, 24) : undefined,
            }))
        : [],
      partnerEmail: typeof d.partnerEmail === "string" ? d.partnerEmail : "",
    };
  } catch {
    return null;
  }
}

function writeDraft(draft: OnboardingDraft) {
  try {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable (private mode, quota) — the wizard still works without persistence.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function OnboardingClient({
  scenarioPresets,
  initialStep = 0,
  initialShowConstraintForm = false,
}: OnboardingClientProps) {
  const [step, setStep] = useState(clampInt(initialStep, 0, STEPS.length - 1));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [prefilledFromQuiz, setPrefilledFromQuiz] = useState(false);
  const firstScroll = useRef(true);

  // Step 1: Goals
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // Step 2: Self-assessment
  const [dimensionScores, setDimensionScores] = useState<Record<string, number>>(defaultScores);

  // Step 3: Scenario
  const [selectedScenario, setSelectedScenario] = useState("default");

  // Step 4: Constraints
  const [userConstraints, setUserConstraints] = useState<DraftConstraint[]>([]);
  const [showConstraintForm, setShowConstraintForm] = useState(initialShowConstraintForm);
  const [newConstraint, setNewConstraint] = useState(EMPTY_CONSTRAINT);
  const [constraintError, setConstraintError] = useState<string | null>(null);

  // Step 5: Partner
  const [partnerEmail, setPartnerEmail] = useState("");

  // D-17: restore an in-progress draft after reload / browser Back.
  // Runs once after hydration; reading localStorage in a lazy initializer would
  // render a different step on the client than on the server (hydration mismatch).
  /* eslint-disable react-hooks/set-state-in-effect -- one-shot client-only restore */
  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setStep(draft.step);
      setRelationshipStatus(draft.relationshipStatus);
      setSelectedGoals(draft.goals);
      setDimensionScores(draft.dimensionScores);
      setSelectedScenario(draft.scenarioMode);
      setUserConstraints(draft.constraints);
      setPartnerEmail(draft.partnerEmail);
    } else {
      // No draft in progress: carry over a recent quiz so we don't ask the same
      // five questions the person just answered. An in-progress draft always
      // wins -- those are real answers typed in this flow.
      const quiz = loadQuizScores();
      if (quiz) {
        setDimensionScores((current) => applyQuizPrefill(current, quiz));
        setPrefilledFromQuiz(true);
      }
    }
    setRestored(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // D-17: persist every answer change once the draft has been restored.
  useEffect(() => {
    if (!restored) return;
    writeDraft({
      step,
      relationshipStatus,
      goals: selectedGoals,
      dimensionScores,
      scenarioMode: selectedScenario,
      constraints: userConstraints,
      partnerEmail,
    });
  }, [restored, step, relationshipStatus, selectedGoals, dimensionScores, selectedScenario, userConstraints, partnerEmail]);

  // D-47: each step starts at the top of the page.
  useEffect(() => {
    if (firstScroll.current) {
      firstScroll.current = false;
      return;
    }
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // ignore
    }
  }, [step]);

  function goToStep(next: number) {
    setError(null);
    setStep(clampInt(next, 0, STEPS.length - 1));
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  function addConstraint() {
    const name = newConstraint.name.trim().slice(0, CONSTRAINT_NAME_MAX);
    if (!name) {
      setConstraintError("Give the constraint a name.");
      return;
    }
    const isRedline = newConstraint.type === "redline";
    const minValue = isRedline ? parseBounded(newConstraint.minValue, 0, 10) : undefined;
    const maxValue = isRedline ? parseBounded(newConstraint.maxValue, 0, 10) : undefined;
    const budgetHours = isRedline ? undefined : parseBounded(newConstraint.budgetHours, 0, 24);
    if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
      setConstraintError("Minimum must not exceed maximum.");
      return;
    }
    setUserConstraints((prev) => [
      ...prev,
      { name, type: newConstraint.type, dimension: newConstraint.dimension, minValue, maxValue, budgetHours },
    ]);
    setNewConstraint(EMPTY_CONSTRAINT);
    setConstraintError(null);
    setShowConstraintForm(false);
  }

  function removeConstraint(index: number) {
    setUserConstraints((prev) => prev.filter((_, i) => i !== index));
  }

  const partnerEmailTrimmed = partnerEmail.trim();
  const partnerEmailInvalid = partnerEmailTrimmed !== "" && !EMAIL_RE.test(partnerEmailTrimmed);

  async function handleSubmit() {
    if (submitting) return;
    if (partnerEmailInvalid) {
      setError("Please enter a valid partner email address, or leave it blank.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const onboardingData: OnboardingData = {
      relationshipStatus,
      goals: selectedGoals,
      vitality: dimensionScores.vitality,
      growth: dimensionScores.growth,
      security: dimensionScores.security,
      connection: dimensionScores.connection,
      emotional: dimensionScores.emotional,
      trust: dimensionScores.trust,
      fairness: dimensionScores.fairness,
      stress: dimensionScores.stress,
      autonomy: dimensionScores.autonomy,
      scenarioMode: selectedScenario,
      constraints: userConstraints,
      partnerEmail: partnerEmailTrimmed || undefined,
    };

    try {
      const result = await completeOnboarding(onboardingData);
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      // A successful action redirects to /overview; the draft is no longer needed.
      clearDraft();
    } catch (err) {
      // Next.js signals redirect() by throwing; let it propagate so navigation proceeds.
      if (err && typeof err === "object" && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
        clearDraft();
        throw err;
      }
      setError("Something went wrong while saving your setup. Please try again.");
      setSubmitting(false);
    }
  }

  const canAdvance = () => {
    if (step === 0) return relationshipStatus !== "";
    return true; // all other steps are optional or have defaults
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-[calc(6rem+max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px)))] sm:pb-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between" role="list" aria-label="Onboarding steps">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div
              key={s.title}
              role="listitem"
              aria-current={isActive ? "step" : undefined}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isDone
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {isDone ? (
                  <Check className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Icon className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive
                    ? "text-primary"
                    : isDone
                      ? "text-primary/70"
                      : "text-muted-foreground"
                }`}
              >
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Goals */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" aria-hidden="true" />
              Welcome! Let&apos;s get to know you
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3" role="group" aria-labelledby="onboarding-status-label">
              <Label id="onboarding-status-label" className="text-base font-medium">
                What&apos;s your relationship status?
              </Label>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIP_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={relationshipStatus === status}
                    onClick={() => setRelationshipStatus(status)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      relationshipStatus === status
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3" role="group" aria-labelledby="onboarding-goals-label">
              <Label id="onboarding-goals-label" className="text-base font-medium">
                What would you like to improve? (select any)
              </Label>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    aria-pressed={selectedGoals.includes(goal)}
                    onClick={() => toggleGoal(goal)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      selectedGoals.includes(goal)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Self-Assessment */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" aria-hidden="true" />
              Quick Self-Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Rate each dimension from 1 (very low) to 10 (excellent). This
              becomes your first daily log.
            </p>
            {/* A silent prefill reads as a bug, so say where the numbers came
                from and make it clear they are still editable. */}
            {prefilledFromQuiz && (
              <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
                We filled in five of these from the quiz you just took — adjust
                anything that does not feel right.
              </p>
            )}
            {DIMENSION_KEYS.map((key) => {
              const info = DIMENSION_LABELS[key];
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{info.label}</span>
                      <p className="text-xs text-muted-foreground">
                        {info.description}
                      </p>
                    </div>
                    <span
                      className="min-w-[2rem] text-right font-mono text-lg font-semibold text-primary"
                      aria-hidden="true"
                    >
                      {dimensionScores[key]}
                    </span>
                  </div>
                  <Slider
                    aria-label={info.label}
                    value={[dimensionScores[key]]}
                    onValueChange={(v) => {
                      const val = Array.isArray(v) ? v[0] : v;
                      setDimensionScores((prev) => ({
                        ...prev,
                        [key]: val,
                      }));
                    }}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Scenario Selection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
              Choose Your Scenario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Scenarios adjust how the optimizer weighs different dimensions
              based on your current life situation.
            </p>
            <div className="grid gap-3" role="group" aria-label="Scenario">
              {scenarioPresets.map((preset) => (
                <button
                  key={preset.mode}
                  type="button"
                  aria-pressed={selectedScenario === preset.mode}
                  onClick={() => setSelectedScenario(preset.mode)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedScenario === preset.mode
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{preset.name}</span>
                    {selectedScenario === preset.mode && (
                      <Badge variant="default" className="text-xs">
                        Selected
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Constraints */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
              Set Constraints (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Constraints define boundaries you don&apos;t want to cross. For
              example, minimum trust level or weekly time budgets. You can always
              change these later.
            </p>

            {userConstraints.length > 0 && (
              <div className="space-y-2">
                {userConstraints.map((c, i) => (
                  <div
                    key={`${c.name}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-medium">{c.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {c.type.replace("_", " ")} on {c.dimension}
                        {c.minValue !== undefined && ` (min: ${c.minValue})`}
                        {c.maxValue !== undefined && ` (max: ${c.maxValue})`}
                        {c.budgetHours !== undefined &&
                          ` (${c.budgetHours}h budget)`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove constraint ${c.name}`}
                      onClick={() => removeConstraint(i)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {showConstraintForm ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor="constraint-name">Name</Label>
                  <Input
                    id="constraint-name"
                    value={newConstraint.name}
                    maxLength={CONSTRAINT_NAME_MAX}
                    onChange={(e) =>
                      setNewConstraint((prev) => ({
                        ...prev,
                        name: e.target.value.slice(0, CONSTRAINT_NAME_MAX),
                      }))
                    }
                    placeholder="e.g., Minimum trust level"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="constraint-type">Type</Label>
                    <select
                      id="constraint-type"
                      aria-label="Constraint type"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={newConstraint.type}
                      onChange={(e) =>
                        setNewConstraint((prev) => ({
                          ...prev,
                          type: e.target.value as ConstraintType,
                        }))
                      }
                    >
                      <option value="redline">Redline</option>
                      <option value="time_budget">Time Budget</option>
                      <option value="energy_budget">Energy Budget</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="constraint-dimension">Dimension</Label>
                    <select
                      id="constraint-dimension"
                      aria-label="Constraint dimension"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={newConstraint.dimension}
                      onChange={(e) =>
                        setNewConstraint((prev) => ({
                          ...prev,
                          dimension: e.target.value,
                        }))
                      }
                    >
                      {CONSTRAINT_DIMENSIONS.map((d) => (
                        <option key={d} value={d}>
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {newConstraint.type === "redline" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="constraint-min">Min Value (0–10)</Label>
                      <Input
                        id="constraint-min"
                        type="number"
                        min={0}
                        max={10}
                        step={1}
                        inputMode="numeric"
                        value={newConstraint.minValue}
                        onChange={(e) =>
                          setNewConstraint((prev) => ({
                            ...prev,
                            minValue: e.target.value,
                          }))
                        }
                        placeholder="e.g., 3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="constraint-max">Max Value (0–10)</Label>
                      <Input
                        id="constraint-max"
                        type="number"
                        min={0}
                        max={10}
                        step={1}
                        inputMode="numeric"
                        value={newConstraint.maxValue}
                        onChange={(e) =>
                          setNewConstraint((prev) => ({
                            ...prev,
                            maxValue: e.target.value,
                          }))
                        }
                        placeholder="e.g., 8"
                      />
                    </div>
                  </div>
                )}
                {(newConstraint.type === "time_budget" ||
                  newConstraint.type === "energy_budget") && (
                  <div className="space-y-2">
                    <Label htmlFor="constraint-budget">Budget Hours (0–24)</Label>
                    <Input
                      id="constraint-budget"
                      type="number"
                      min={0}
                      max={24}
                      step={1}
                      inputMode="numeric"
                      value={newConstraint.budgetHours}
                      onChange={(e) =>
                        setNewConstraint((prev) => ({
                          ...prev,
                          budgetHours: e.target.value,
                        }))
                      }
                      placeholder="e.g., 3"
                    />
                  </div>
                )}
                {constraintError && (
                  <p className="text-sm text-destructive" role="alert">
                    {constraintError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button onClick={addConstraint} disabled={!newConstraint.name.trim()}>
                    Add Constraint
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConstraintError(null);
                      setShowConstraintForm(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowConstraintForm(true)}
              >
                + Add a Constraint
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Partner Invite */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
              Invite Your Partner (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Couplemetric works best when both partners use it together. You can
              always do this later from the Partner page.
            </p>
            <div className="space-y-2">
              <Label htmlFor="partner-email">Partner&apos;s Email</Label>
              <Input
                id="partner-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={partnerEmail}
                aria-invalid={partnerEmailInvalid || undefined}
                aria-describedby={partnerEmailInvalid ? "partner-email-error" : undefined}
                onChange={(e) => {
                  setPartnerEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="partner@example.com"
              />
              {partnerEmailInvalid && (
                <p id="partner-email-error" className="text-sm text-destructive">
                  Enter a valid email address, or leave this blank.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Navigation. Sticky so "Next" stays on screen without scrolling to the
          bottom of the step (tester feedback 2026-10-23). `bottom-0` sticks it
          above the page's safe-area padding; the backdrop keeps the step
          content readable as it scrolls underneath. */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-border/40 bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:px-4">
        <Button
          variant="outline"
          onClick={() => goToStep(step - 1)}
          disabled={step === 0 || submitting}
          className="h-12 px-4"
        >
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => goToStep(step + 1)}
            disabled={!canAdvance()}
            className="h-12 min-w-[7rem] px-4"
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting || partnerEmailInvalid}
            className="h-12 px-4"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Setting up...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                Complete Setup
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
