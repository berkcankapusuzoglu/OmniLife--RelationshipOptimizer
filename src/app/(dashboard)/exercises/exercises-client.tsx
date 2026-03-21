"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, BookOpen, Star, Play, Check, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { getRecommendedExercises } from "@/lib/recommendations/engine";
import { completeExercise } from "./actions";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { TIERS } from "@/lib/subscription/tiers";
import type { PillarScores, RelDimScores, Exercise } from "@/lib/engine/types";
import type { ImpactSummary } from "@/lib/engine/impact";

interface ExercisesClientProps {
  currentScores: {
    pillars: PillarScores;
    relDims: RelDimScores;
  } | null;
  recentExerciseIds: string[];
  userId: string;
  userTier: string;
  impactSummary?: ImpactSummary;
}

export function ExercisesClient({
  currentScores,
  recentExerciseIds,
  userId,
  userTier,
  impactSummary,
}: ExercisesClientProps) {
  const tier = userTier as "free" | "premium";
  const exerciseLimit = TIERS[tier].features.exerciseLimit;
  const defaultScores = {
    pillars: { vitality: 5, growth: 5, security: 5, connection: 5 },
    relDims: { emotional: 5, trust: 5, fairness: 5, stress: 5, autonomy: 5 },
  };
  const scores = currentScores ?? defaultScores;

  const exercises = getRecommendedExercises(
    scores.pillars,
    scores.relDims,
    [],
    recentExerciseIds,
    "default"
  );

  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  async function handleComplete(exercise: Exercise, rating: number) {
    await completeExercise({
      userId,
      exerciseId: exercise.id,
      title: exercise.title,
      theoryBasis: exercise.theoryBasis,
      targetDimension: exercise.targetDimensions[0],
      rating,
    });
    setCompleted((prev) => new Set(prev).add(exercise.id));
    setActiveExercise(null);
    setIsRunning(false);
    setTimer(0);
  }

  if (activeExercise) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{activeExercise.title}</CardTitle>
            <Badge variant="outline">{activeExercise.category}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {activeExercise.theoryBasis}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="font-mono text-4xl font-bold tabular-nums">
              {formatTime(timer)}
            </div>
            <div className="text-sm text-muted-foreground">
              / {activeExercise.durationMinutes}:00
            </div>
          </div>

          <div className="flex justify-center gap-2">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              variant={isRunning ? "outline" : "default"}
            >
              {isRunning ? "Pause" : "Start"}
              <Play className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="font-medium">Instructions</h3>
            <ol className="space-y-2">
              {activeExercise.instructions.map((instruction, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-muted-foreground">
                    {i + 1}.
                  </span>
                  {instruction}
                </li>
              ))}
            </ol>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-medium">How was it?</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant="outline"
                  size="sm"
                  onClick={() => handleComplete(activeExercise, rating)}
                >
                  {rating} <Star className="ml-1 h-3 w-3" />
                </Button>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              setActiveExercise(null);
              setIsRunning(false);
              setTimer(0);
            }}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  const visibleExercises =
    exerciseLimit === Infinity
      ? exercises
      : exercises.slice(0, exerciseLimit);
  const hasMore = exercises.length > visibleExercises.length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {visibleExercises.map((exercise) => (
        <Card key={exercise.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">{exercise.title}</CardTitle>
              {completed.has(exercise.id) && (
                <Check className="h-5 w-5 text-emerald-400" />
              )}
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {exercise.category}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Clock className="mr-1 h-3 w-3" />
                {exercise.durationMinutes}m
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {exercise.difficulty}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {exercise.description}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              {exercise.theoryBasis}
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => setActiveExercise(exercise)}
              disabled={completed.has(exercise.id)}
            >
              {completed.has(exercise.id) ? "Completed" : "Start Exercise"}
            </Button>
          </CardContent>
        </Card>
      ))}

      {hasMore && (
        <div className="col-span-full">
          <UpgradePrompt
            featureDescription={`You're seeing ${exerciseLimit} of ${exercises.length} exercises. Upgrade to unlock all ${exercises.length} personalized exercises.`}
          />
        </div>
      )}

      {visibleExercises.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="py-8 text-center text-muted-foreground">
            Log your daily scores to get personalized exercise recommendations.
          </CardContent>
        </Card>
      )}

      {impactSummary && impactSummary.byExercise.length > 0 && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Impact History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {impactSummary.mostEffective && (
              <div className="rounded-md border bg-emerald-500/5 p-3">
                <p className="text-sm font-medium">
                  Most effective: {impactSummary.mostEffective.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg. improvement: +{impactSummary.mostEffective.avgChange} ({impactSummary.mostEffective.count} sessions)
                </p>
              </div>
            )}
            <div className="space-y-2">
              {impactSummary.byExercise.map((ex) => (
                <div key={ex.exerciseId} className="flex items-center justify-between text-sm">
                  <span className="truncate">{ex.title}</span>
                  <div className="flex items-center gap-2">
                    {ex.avgChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span className={ex.avgChange >= 0 ? "text-emerald-400" : "text-destructive"}>
                      {ex.avgChange >= 0 ? "+" : ""}{ex.avgChange}
                    </span>
                    <Badge variant="secondary" className="text-xs">{ex.count}x</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
