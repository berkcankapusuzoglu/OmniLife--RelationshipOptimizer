"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { encodeQuizScores, saveQuizScores } from "@/lib/quiz";

const QUESTIONS = [
  {
    id: "emotional",
    label: "How emotionally connected do you feel to your partner this week?",
    low: "Disconnected",
    high: "Deeply connected",
    microcopy:
      "This dimension predicts 70% of long-term satisfaction — Gottman Institute",
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
      "Couples who grow together stay together — 89% correlation",
  },
  {
    id: "stress",
    label:
      "How effectively do you and your partner handle stress together?",
    low: "We struggle",
    high: "We thrive",
    microcopy:
      "How you handle stress together matters more than how often you’re stressed",
  },
] as const;

const DEFAULT_ANSWER = 5;

/**
 * Single-screen step flow (tester feedback 2026-10-23: "user need to scroll
 * down to click next, it should fit the full screen").
 *
 * Layout contract for every screen here:
 * - the root is exactly one viewport tall (`h-[100dvh]`) and does not scroll;
 * - the primary action lives in a bottom bar that is always on screen and
 *   padded for the home indicator (`safe-bottom`);
 * - the question body is the only flexible region and may shrink (`min-h-0`),
 *   so the bar can never be pushed below the fold.
 * `/quiz` is in CHROME_HIDDEN_PATHS so the shared public header/footer does not
 * add height on top of this.
 */
export function QuizClient() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => QUESTIONS.map(() => DEFAULT_ANSWER));
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
      // Keep the answers on this device so onboarding can prefill them after signup.
      saveQuizScores(answers);
      router.push(`/quiz/result?s=${encodeURIComponent(encodeQuizScores(answers))}`);
    } else {
      goTo(step + 1, "next");
    }
  };

  const handlePrevious = () => {
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
      <div className="flex h-[100dvh] flex-col bg-gradient-to-br from-background via-background to-purple-950/20">
        <div className="safe-top flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-4">
          <div className="w-full max-w-lg text-center">
            <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              How Strong Is Your Relationship,{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Really?
              </span>
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              5 questions. 60 seconds. Based on the same dimensions used by
              relationship therapists.
            </p>
            <p className="mt-4 text-sm text-muted-foreground/80">
              No signup required. Results are instant.
            </p>
          </div>
        </div>

        <div className="safe-bottom shrink-0 border-t border-border/40 bg-background/80 px-6 pb-4 pt-4 backdrop-blur">
          <Button
            onClick={() => setStarted(true)}
            className="mx-auto h-14 w-full max-w-lg text-lg font-semibold"
          >
            Start Quiz
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Question screens ----------
  return (
    <div className="flex h-[100dvh] flex-col bg-gradient-to-br from-background via-background to-purple-950/20">
      {/* Progress */}
      <div className="safe-top mx-auto w-full max-w-lg shrink-0 px-6 pt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {step + 1} of {QUESTIONS.length}
          </span>
          <span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}%</span>
        </div>
        <Progress value={((step + 1) / QUESTIONS.length) * 100} />
      </div>

      {/* Question area — the only region allowed to shrink */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-4">
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
            <h2 className="mb-2 text-center text-xl font-semibold leading-snug tracking-tight sm:text-2xl md:text-3xl">
              {currentQ.label}
            </h2>

            {/* Micro-copy */}
            <p className="mb-4 text-center text-xs italic text-muted-foreground/70 sm:mb-6 sm:text-sm">
              {currentQ.microcopy}
            </p>

            {/* Score display */}
            <div className="mb-4 text-center sm:mb-6">
              <span className="text-5xl font-bold tabular-nums text-primary sm:text-6xl">
                {answers[step]}
              </span>
              <span className="text-xl text-muted-foreground sm:text-2xl">/10</span>
            </div>

            {/* Slider */}
            <div className="mx-auto max-w-md px-2" style={{ touchAction: "none" }}>
              <Slider
                value={[answers[step]]}
                onValueChange={updateAnswer}
                min={1}
                max={10}
                step={1}
                aria-label={currentQ.label}
              />
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>{currentQ.low}</span>
                <span>{currentQ.high}</span>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground/60">
              Leave it at {DEFAULT_ANSWER} if that feels right, or drag the slider.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom action bar: always on screen, never scrolled out of reach. */}
      <div className="safe-bottom shrink-0 border-t border-border/40 bg-background/80 px-6 pb-4 pt-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={step === 0}
            className="h-12 px-4 disabled:opacity-0"
            aria-label="Previous question"
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Back
          </Button>
          <Button onClick={handleNext} className="h-12 flex-1 text-base font-semibold">
            {isLastQuestion ? "See My Score" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
