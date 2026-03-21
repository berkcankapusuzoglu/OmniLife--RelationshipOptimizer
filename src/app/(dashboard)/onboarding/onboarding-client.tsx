"use client";

import { useState } from "react";
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

interface ScenarioPresetData {
  id: string;
  name: string;
  mode: string;
  description: string;
}

interface OnboardingClientProps {
  userId: string;
  scenarioPresets: ScenarioPresetData[];
}

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
    label: "Autonomy",
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

const STEPS = [
  { title: "Goals", icon: Target },
  { title: "Self-Assessment", icon: Sliders },
  { title: "Scenario", icon: Layers },
  { title: "Constraints", icon: Shield },
  { title: "Partner", icon: UserPlus },
];

export function OnboardingClient({ userId, scenarioPresets }: OnboardingClientProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Goals
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // Step 2: Self-assessment
  const [dimensionScores, setDimensionScores] = useState<Record<string, number>>(
    Object.fromEntries(DIMENSION_KEYS.map((k) => [k, 5]))
  );

  // Step 3: Scenario
  const [selectedScenario, setSelectedScenario] = useState("default");

  // Step 4: Constraints
  const [userConstraints, setUserConstraints] = useState<
    Array<{
      name: string;
      type: "time_budget" | "energy_budget" | "redline";
      dimension: string;
      minValue?: number;
      maxValue?: number;
      budgetHours?: number;
    }>
  >([]);
  const [showConstraintForm, setShowConstraintForm] = useState(false);
  const [newConstraint, setNewConstraint] = useState({
    name: "",
    type: "redline" as "time_budget" | "energy_budget" | "redline",
    dimension: "vitality",
    minValue: "",
    maxValue: "",
    budgetHours: "",
  });

  // Step 5: Partner
  const [partnerEmail, setPartnerEmail] = useState("");

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  function addConstraint() {
    if (!newConstraint.name) return;
    setUserConstraints((prev) => [
      ...prev,
      {
        name: newConstraint.name,
        type: newConstraint.type,
        dimension: newConstraint.dimension,
        minValue: newConstraint.minValue ? Number(newConstraint.minValue) : undefined,
        maxValue: newConstraint.maxValue ? Number(newConstraint.maxValue) : undefined,
        budgetHours: newConstraint.budgetHours
          ? Number(newConstraint.budgetHours)
          : undefined,
      },
    ]);
    setNewConstraint({
      name: "",
      type: "redline",
      dimension: "vitality",
      minValue: "",
      maxValue: "",
      budgetHours: "",
    });
    setShowConstraintForm(false);
  }

  function removeConstraint(index: number) {
    setUserConstraints((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
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
      partnerEmail: partnerEmail || undefined,
    };

    try {
      await completeOnboarding(userId, onboardingData);
    } catch {
      // redirect throws an error in Next.js, which is expected
    }
  }

  const canAdvance = () => {
    if (step === 0) return relationshipStatus !== "";
    return true; // all other steps are optional or have defaults
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div
              key={s.title}
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
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
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
              {i < STEPS.length - 1 && (
                <div className="absolute" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Goals */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Welcome! Let's get to know you
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">
                What's your relationship status?
              </Label>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIP_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
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

            <div className="space-y-3">
              <Label className="text-base font-medium">
                What would you like to improve? (select any)
              </Label>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
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
              <Sliders className="h-5 w-5 text-primary" />
              Quick Self-Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Rate each dimension from 1 (very low) to 10 (excellent). This
              becomes your first daily log.
            </p>
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
                    <span className="min-w-[2rem] text-right font-mono text-lg font-semibold text-primary">
                      {dimensionScores[key]}
                    </span>
                  </div>
                  <Slider
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
              <Layers className="h-5 w-5 text-primary" />
              Choose Your Scenario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Scenarios adjust how the optimizer weighs different dimensions
              based on your current life situation.
            </p>
            <div className="grid gap-3">
              {scenarioPresets.map((preset) => (
                <button
                  key={preset.mode}
                  type="button"
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
              <Shield className="h-5 w-5 text-primary" />
              Set Constraints (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Constraints define boundaries you don't want to cross. For
              example, minimum trust level or weekly time budgets. You can always
              change these later.
            </p>

            {userConstraints.length > 0 && (
              <div className="space-y-2">
                {userConstraints.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <span className="text-sm font-medium">{c.name}</span>
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
                  <Label>Name</Label>
                  <Input
                    value={newConstraint.name}
                    onChange={(e) =>
                      setNewConstraint((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g., Minimum trust level"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={newConstraint.type}
                      onChange={(e) =>
                        setNewConstraint((prev) => ({
                          ...prev,
                          type: e.target.value as "time_budget" | "energy_budget" | "redline",
                        }))
                      }
                    >
                      <option value="redline">Redline</option>
                      <option value="time_budget">Time Budget</option>
                      <option value="energy_budget">Energy Budget</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dimension</Label>
                    <select
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
                      <Label>Min Value</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
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
                      <Label>Max Value</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
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
                    <Label>Budget Hours</Label>
                    <Input
                      type="number"
                      min={0}
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
                <div className="flex gap-2">
                  <Button onClick={addConstraint} disabled={!newConstraint.name}>
                    Add Constraint
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowConstraintForm(false)}
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
              <UserPlus className="h-5 w-5 text-primary" />
              Invite Your Partner (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              OmniLife works best when both partners use it together. You can
              always do this later from the Partner page.
            </p>
            <div className="space-y-2">
              <Label>Partner's Email</Label>
              <Input
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="partner@example.com"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Complete Setup
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
