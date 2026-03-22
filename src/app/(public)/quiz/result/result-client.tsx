"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NewsletterSignup } from "@/components/newsletter-signup";

// ─── Types ───────────────────────────────────────────────────────────

interface Dimension {
  label: string;
  value: number;
}

interface Archetype {
  name: string;
  description: string;
  badge: string;
}

// ─── Archetype logic ─────────────────────────────────────────────────

function getArchetype(dimensions: Dimension[]): Archetype {
  const scores: Record<string, number> = {};
  for (const d of dimensions) scores[d.label.toLowerCase()] = d.value;

  const emotional = scores["emotional"] ?? 5;
  const fairness = scores["fairness"] ?? 5;
  const trust = scores["trust"] ?? 5;
  const growth = scores["growth"] ?? 5;
  const stress = scores["stress"] ?? 5;

  const all = [emotional, fairness, trust, growth, stress];
  const allHigh = all.every((s) => s >= 8);
  const mostLow = all.filter((s) => s < 5).length >= 3;

  if (allHigh) {
    return {
      name: "The Secure Anchor",
      description:
        "Your relationship is a rock. You provide stability and safety.",
      badge: "\u2693",
    };
  }
  if (mostLow) {
    return {
      name: "The Awakening Couple",
      description:
        "There\u2019s real potential here. You just need the right tools.",
      badge: "\ud83c\udf31",
    };
  }
  if (stress >= 8 && emotional < 8 && trust < 8) {
    return {
      name: "The Stress Warrior",
      description:
        "You handle pressure well together. Crisis mode? You\u2019ve got this.",
      badge: "\ud83d\udee1\ufe0f",
    };
  }
  if (emotional >= 7 && growth >= 7 && stress < 6) {
    return {
      name: "The Passionate Explorer",
      description:
        "You thrive on deep connection and growth but sometimes forget to manage stress.",
      badge: "\ud83d\udd25",
    };
  }
  if (trust >= 7 && fairness >= 7 && emotional < 7) {
    return {
      name: "The Loyal Guardian",
      description:
        "You build trust through actions, not words. Your partnership is built on reliability.",
      badge: "\ud83d\udc9a",
    };
  }
  if (emotional >= 7 && stress < 5) {
    return {
      name: "The Compassionate Healer",
      description:
        "You feel deeply but struggle when things get tough.",
      badge: "\ud83d\udc9c",
    };
  }
  if (fairness >= 7 && trust >= 5) {
    return {
      name: "The Fair Partner",
      description:
        "Equity matters to you. You track who does what \u2014 and that\u2019s not a bad thing.",
      badge: "\u2696\ufe0f",
    };
  }
  if (growth >= 6) {
    return {
      name: "The Growth Seeker",
      description:
        "You\u2019re always pushing to be better \u2014 individually and together.",
      badge: "\ud83d\ude80",
    };
  }

  // Fallback
  return {
    name: "The Growth Seeker",
    description:
      "You\u2019re always pushing to be better \u2014 individually and together.",
    badge: "\ud83d\ude80",
  };
}

// ─── Percentile logic ────────────────────────────────────────────────

function getPercentile(score: number): string {
  if (score >= 96) return "99";
  if (score >= 86) return "93";
  if (score >= 76) return "82";
  if (score >= 66) return "65";
  if (score >= 51) return "47";
  if (score >= 31) return "28";
  return "12";
}

// ─── Radar chart ─────────────────────────────────────────────────────

function RadarChart({ dimensions }: { dimensions: Dimension[] }) {
  const size = 260;
  const center = size / 2;
  const radius = 100;
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
    const p = polarToCart(i * angleStep, radius + 24);
    return (
      <text
        key={i}
        x={p.x}
        y={p.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-muted-foreground text-[11px]"
      >
        {d.label}
      </text>
    );
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-[280px]"
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
  const [showContent, setShowContent] = useState(false);
  const [flash, setFlash] = useState(false);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const archetype = getArchetype(dimensions);
  const percentile = getPercentile(pulse);

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

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/quiz/result?s=${shareParam}`
      : "";

  const shareText = `I\u2019m a ${archetype.name} \u2014 our relationship scored ${pulse}/100, stronger than ${percentile}% of couples. Think you can beat it? \ud83d\udd25`;
  const partnerShareText = `I just took the OmniLife Relationship Quiz. See if your partner agrees with your score \u2014 take it now!`;

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, url: shareUrl });
        return;
      } catch {
        // fallback
      }
    }
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareText, shareUrl]);

  const handlePartnerShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: partnerShareText, url: shareUrl });
        return;
      } catch {
        // fallback
      }
    }
    await navigator.clipboard.writeText(`${partnerShareText}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [partnerShareText, shareUrl]);

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
          <span className="text-sm text-muted-foreground">/100</span>
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
        <Button onClick={handleShare} className="w-full">
          {copied ? "Link Copied!" : "Challenge Your Partner"}
        </Button>
        <Button
          onClick={handlePartnerShare}
          variant="outline"
          className="w-full"
        >
          See if your partner agrees
        </Button>
        <Button render={<Link href="/register" />} className="w-full">
          Get Your Full Assessment — Free
        </Button>
        <Button
          render={<Link href="/quiz" />}
          variant="ghost"
          className="w-full"
        >
          Retake Quiz
        </Button>
      </div>

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
