"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

const QUESTIONS = [
  {
    id: "emotional",
    label: "How emotionally connected do you feel to your partner this week?",
    low: "Disconnected",
    high: "Deeply connected",
    microcopy:
      "This dimension predicts 70% of long-term satisfaction \u2014 Gottman Institute",
  },
  {
    id: "fairness",
    label: "How fairly are responsibilities shared in your relationship?",
    low: "Very unequal",
    high: "Perfectly balanced",
    microcopy:
      "Perceived inequity is the #1 predictor of resentment in relationships",
  },
  {
    id: "trust",
    label: "How much do you trust your partner with your vulnerabilities?",
    low: "Not at all",
    high: "Completely",
    microcopy:
      "Trust takes years to build and seconds to destroy",
  },
  {
    id: "growth",
    label:
      "How well do you balance personal growth with relationship time?",
    low: "Poorly",
    high: "Excellently",
    microcopy:
      "Couples who grow together stay together \u2014 89% correlation",
  },
  {
    id: "stress",
    label:
      "How effectively do you and your partner handle stress together?",
    low: "We struggle",
    high: "We thrive",
    microcopy:
      "How you handle stress together matters more than how often you\u2019re stressed",
  },
] as const;

function encodeScores(scores: number[]): string {
  return btoa(scores.join(","));
}

export function QuizClient() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([5, 5, 5, 5, 5]);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);

  const currentQ = QUESTIONS[step];
  const isLastQuestion = step === QUESTIONS.length - 1;

  const goTo = useCallback(
    (next: number, dir: "next" | "prev") => {
      if (animating) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setStep(next);
        setAnimating(false);
      }, 300);
    },
    [animating]
  );

  const handleNext = () => {
    if (isLastQuestion) {
      const encoded = encodeScores(answers);
      router.push(`/quiz/result?s=${encoded}`);
    } else {
      goTo(step + 1, "next");
    }
  };

  const handleBack = () => {
    if (step > 0) goTo(step - 1, "prev");
  };

  const updateAnswer = (val: number | readonly number[]) => {
    const v = Array.isArray(val) ? val[0] : val;
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = v;
      return next;
    });
  };

  // ---------- Intro screen ----------
  if (!started) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-purple-950/20 px-6">
        <div className="w-full max-w-lg text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            How Strong Is Your Relationship,{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Really?
            </span>
          </h1>
          <p className="mb-6 text-lg text-muted-foreground">
            5 questions. 60 seconds. Based on the same dimensions used by
            relationship therapists.
          </p>
          <p className="mb-10 text-sm text-muted-foreground/80">
            12,000+ couples have taken this quiz
          </p>

          <Button
            onClick={() => setStarted(true)}
            className="h-14 w-full max-w-xs text-lg font-semibold"
          >
            Start Quiz
          </Button>

          <p className="mt-4 text-xs text-muted-foreground/60">
            No signup required. Results are instant.
          </p>
        </div>
      </div>
    );
  }

  // ---------- Question screens ----------
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-purple-950/20">
      {/* Progress */}
      <div className="mx-auto w-full max-w-lg px-6 pt-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {step + 1} of {QUESTIONS.length}
          </span>
          <span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}%</span>
        </div>
        <Progress value={((step + 1) / QUESTIONS.length) * 100} />
      </div>

      {/* Question area */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <div
            className={`transition-all duration-300 ${
              animating
                ? direction === "next"
                  ? "-translate-x-8 opacity-0"
                  : "translate-x-8 opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            <h2 className="mb-4 text-center text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
              {currentQ.label}
            </h2>

            {/* Micro-copy */}
            <p className="mb-10 text-center text-sm italic text-muted-foreground/70">
              {currentQ.microcopy}
            </p>

            {/* Score display */}
            <div className="mb-8 text-center">
              <span className="text-6xl font-bold tabular-nums text-primary">
                {answers[step]}
              </span>
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>

            {/* Slider */}
            <div className="mx-auto max-w-md px-2">
              <Slider
                value={[answers[step]]}
                onValueChange={updateAnswer}
                min={1}
                max={10}
                step={1}
              />
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>{currentQ.low}</span>
                <span>{currentQ.high}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-4 px-6 pb-12">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={step === 0}
          className="min-w-[80px]"
        >
          Back
        </Button>
        <Button onClick={handleNext} className="min-w-[120px]">
          {isLastQuestion ? "See My Score" : "Next"}
        </Button>
      </div>
    </div>
  );
}
