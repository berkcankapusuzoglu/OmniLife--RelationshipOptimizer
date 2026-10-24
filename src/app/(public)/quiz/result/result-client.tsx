"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics/track";
import { Button } from "@/components/ui/button";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { shareCard, type ShareCardResult } from "@/lib/capacitor/share";
import { hapticScoreReveal } from "@/lib/capacitor/haptics";
import {
  type QuizDimension,
  buildQuizShareText,
  getArchetype,
  getPercentile,
  quizRegisterHref,
  saveQuizScores,
  toQuizScores,
} from "@/lib/quiz";

// ─── Types ───────────────────────────────────────────────────────────

interface Dimension {
  key: QuizDimension;
  label: string;
  value: number;
}

// ─── Radar chart ─────────────────────────────────────────────────────

function RadarChart({ dimensions }: { dimensions: Dimension[] }) {
  // The viewBox leaves a margin around the outer ring so the labels
  // ("Fairness", "Stress") render inside it instead of being clipped.
  const size = 300;
  const center = size / 2;
  const radius = 96;
  const labelRadius = radius + 24;
  const n = dimensions.length;

  function polarToCart(angle: number, r: number) {
    const a = (angle - 90) * (Math.PI / 180);
    return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) };
  }

  const angleStep = 360 / n;

  const rings = [0.25, 0.5, 0.75, 1].map((frac) => {
    const r = radius * frac;
    const points = Array.from({ length: n }, (_, i) => {
      const p = polarToCart(i * angleStep, r);
      return `${p.x},${p.y}`;
    }).join(" ");
    return (
      <polygon
        key={frac}
        points={points}
        fill="none"
        stroke="currentColor"
        className="text-muted-foreground/20"
      />
    );
  });

  const axes = Array.from({ length: n }, (_, i) => {
    const p = polarToCart(i * angleStep, radius);
    return (
      <line
        key={i}
        x1={center}
        y1={center}
        x2={p.x}
        y2={p.y}
        stroke="currentColor"
        className="text-muted-foreground/20"
      />
    );
  });

  const dataPoints = dimensions
    .map((d, i) => {
      const p = polarToCart(i * angleStep, (d.value / 10) * radius);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  const labels = dimensions.map((d, i) => {
    const p = polarToCart(i * angleStep, labelRadius);
    return (
      <text
        key={i}
        x={p.x}
        y={p.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-muted-foreground text-[12px]"
      >
        {d.label}
      </text>
    );
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      overflow="visible"
      className="mx-auto w-full max-w-[300px] overflow-visible"
      role="img"
      aria-label="Your five quiz dimensions"
    >
      {rings}
      {axes}
      <polygon
        points={dataPoints}
        className="fill-primary/20 stroke-primary"
        strokeWidth={2}
      />
      {dimensions.map((d, i) => {
        const p = polarToCart(i * angleStep, (d.value / 10) * radius);
        return (
          <circle key={i} cx={p.x} cy={p.y} r={4} className="fill-primary" />
        );
      })}
      {labels}
    </svg>
  );
}

// ─── Reveal phases ───────────────────────────────────────────────────

type Phase = "counting" | "done";

const NOTICES: Partial<Record<ShareCardResult, string>> = {
  copied: "Link copied to clipboard",
  failed: "Couldn’t share — try copying the page link",
};

// ─── Main component ──────────────────────────────────────────────────

export function ResultClient({
  pulse,
  interpretation,
  dimensions,
  shareParam,
}: {
  pulse: number;
  interpretation: string;
  dimensions: Dimension[];
  shareParam: string;
}) {
  const [phase, setPhase] = useState<Phase>("counting");
  const [displayScore, setDisplayScore] = useState(0);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [flash, setFlash] = useState(false);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticFired = useRef(false);
  const inFlight = useRef(false);

  const values = dimensions.map((d) => d.value);
  const archetype = getArchetype(toQuizScores(values));
  const percentile = getPercentile(pulse);

  // Native-only score-reveal haptic, once per mount; silent no-op on the web.
  useEffect(() => {
    if (hapticFired.current) return;
    hapticFired.current = true;
    void hapticScoreReveal();
  }, []);

  // Remember the answers on this device (also for shared links opened here) so
  // signup → onboarding can prefill the self-assessment.
  useEffect(() => {
    if (dimensions.length === 5) saveQuizScores(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareParam]);

  // Phase 1: count up to score
  useEffect(() => {
    if (phase !== "counting") return;
    let current = 0;
    const step = Math.max(1, Math.floor(pulse / 40));
    const tick = () => {
      current = Math.min(current + step, pulse);
      setDisplayScore(current);
      if (current < pulse) {
        animRef.current = setTimeout(tick, 25);
      } else {
        // flash then done
        setFlash(true);
        setTimeout(() => {
          setFlash(false);
          setPhase("done");
        }, 600);
      }
    };
    tick();
    return () => {
      if (animRef.current) clearTimeout(animRef.current);
    };
  }, [phase, pulse]);

  // Phase 3: fade in content
  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(t);
  }, [phase]);

  const scoreColor =
    pulse < 40
      ? "text-red-400"
      : pulse < 60
        ? "text-amber-400"
        : pulse < 80
          ? "text-purple-400"
          : "text-emerald-400";

  const shareText = buildQuizShareText(archetype, pulse, percentile);
  const partnerShareText = `I just took the Couplemetric Relationship Quiz. See if your partner agrees with your score — take it now!`;

  // Native share sheet on Android; navigator.share then clipboard on the web.
  // One share at a time; a dismissed sheet is respected, not copied over.
  const share = useCallback(
    async (text: string) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      try {
        const shareUrl = `${window.location.origin}/quiz/result?s=${encodeURIComponent(shareParam)}`;
        const result = await shareCard({ title: "Couplemetric Relationship Quiz", text, url: shareUrl });
        if (result === "copied") {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
        const message = NOTICES[result];
        if (message) {
          setNotice(message);
          setTimeout(() => setNotice(null), 2500);
        }
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [shareParam],
  );

  const handleShare = useCallback(() => share(shareText), [share, shareText]);
  const handlePartnerShare = useCallback(() => share(partnerShareText), [share, partnerShareText]);

  // ── Score counting + final result ──
  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-gradient-to-br from-background via-background to-purple-950/20 px-6 py-12">
      {/* Pulse ring */}
      <div className="relative mb-8 flex items-center justify-center">
        {phase === "counting" && (
          <div
            className="absolute h-48 w-48 animate-ping rounded-full bg-primary/10"
            style={{ animationDuration: "2s", animationIterationCount: "3" }}
          />
        )}
        <div
          className={`relative flex h-44 w-44 flex-col items-center justify-center rounded-full border-4 border-primary/30 bg-card transition-transform duration-300 ${
            flash ? "scale-125 border-primary" : ""
          }`}
        >
          <span className={`text-6xl font-bold tabular-nums ${scoreColor}`}>
            {displayScore}
          </span>
          <span className="text-sm text-muted-foreground">/100 · {interpretation}</span>
        </div>
      </div>

      {/* Archetype — fades in after done */}
      <div
        className={`mb-2 text-center transition-all duration-700 ${
          showContent ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <span className="mb-1 text-3xl">{archetype.badge}</span>
        <h1 className="mb-1 bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-3xl font-bold text-transparent">
          {archetype.name}
        </h1>
        <p className="mb-2 max-w-sm text-center text-muted-foreground">
          {archetype.description}
        </p>
      </div>

      {/* Percentile */}
      <div
        className={`mb-10 transition-all duration-700 delay-150 ${
          showContent ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <p className="text-center text-sm text-muted-foreground">
          Your relationship is stronger than{" "}
          <span className="font-semibold text-primary">{percentile}%</span> of
          couples who took this quiz.
        </p>
      </div>

      {/* Radar + breakdown */}
      <div
        className={`w-full max-w-sm transition-all duration-700 delay-300 ${
          showContent ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <RadarChart dimensions={dimensions} />

        <div className="mt-8 space-y-3">
          {dimensions.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="w-20 text-sm text-muted-foreground">
                {d.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000"
                  style={{ width: `${d.value * 10}%` }}
                />
              </div>
              <span className="w-8 text-right text-sm font-medium tabular-nums">
                {d.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div
        className={`mt-12 flex w-full max-w-sm flex-col gap-3 transition-all duration-700 delay-500 ${
          showContent ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        {/* Signup is the primary action and leads. It used to sit third, under two
            share buttons, which buried the only step that converts quiz traffic. */}
        <Button
          render={<Link href={quizRegisterHref(shareParam)} />}
          className="h-12 w-full text-base font-semibold"
          onClick={() => trackEvent("quiz_signup_clicked", {})}
        >
          Get Your Full Assessment — Free
        </Button>
        <Button
          onClick={() => {
            trackEvent("quiz_shared", { target: "partner_challenge" });
            handleShare();
          }}
          variant="outline"
          className="h-12 w-full"
          disabled={busy}
          aria-busy={busy}
        >
          {copied ? "Link Copied!" : "Challenge Your Partner"}
        </Button>
        <Button
          onClick={() => {
            trackEvent("quiz_shared", { target: "partner_compare" });
            handlePartnerShare();
          }}
          variant="outline"
          className="h-12 w-full"
          disabled={busy}
        >
          See if your partner agrees
        </Button>
        <Button
          render={<Link href="/quiz" />}
          variant="ghost"
          className="w-full"
        >
          Retake Quiz
        </Button>
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg"
        >
          {notice}
        </div>
      )}

      {/* Newsletter CTA */}
      <div
        className={`mt-10 w-full max-w-sm rounded-xl border border-violet-500/20 bg-card/50 p-6 backdrop-blur-sm transition-all duration-700 delay-700 ${
          showContent ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <NewsletterSignup
          source="quiz_result"
          heading="Get personalized tips based on your score — delivered weekly"
          description="Free relationship insights tailored to your archetype."
        />
      </div>
    </div>
  );
}
