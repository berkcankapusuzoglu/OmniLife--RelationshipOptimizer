"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Dimension {
  label: string;
  value: number;
}

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

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1].map((frac) => {
    const r = radius * frac;
    const points = Array.from({ length: n }, (_, i) => {
      const p = polarToCart(i * angleStep, r);
      return `${p.x},${p.y}`;
    }).join(" ");
    return <polygon key={frac} points={points} fill="none" stroke="currentColor" className="text-muted-foreground/20" />;
  });

  // Axis lines
  const axes = Array.from({ length: n }, (_, i) => {
    const p = polarToCart(i * angleStep, radius);
    return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="currentColor" className="text-muted-foreground/20" />;
  });

  // Data polygon
  const dataPoints = dimensions.map((d, i) => {
    const p = polarToCart(i * angleStep, (d.value / 10) * radius);
    return `${p.x},${p.y}`;
  }).join(" ");

  // Labels
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
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[280px]">
      {rings}
      {axes}
      <polygon
        points={dataPoints}
        className="fill-primary/20 stroke-primary"
        strokeWidth={2}
      />
      {/* Data dots */}
      {dimensions.map((d, i) => {
        const p = polarToCart(i * angleStep, (d.value / 10) * radius);
        return <circle key={i} cx={p.x} cy={p.y} r={4} className="fill-primary" />;
      })}
      {labels}
    </svg>
  );
}

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
  const [displayScore, setDisplayScore] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate score count-up
  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.floor(pulse / 40));
    const tick = () => {
      current = Math.min(current + step, pulse);
      setDisplayScore(current);
      if (current < pulse) {
        animRef.current = setTimeout(tick, 30);
      }
    };
    tick();
    return () => {
      if (animRef.current) clearTimeout(animRef.current);
    };
  }, [pulse]);

  // Show rest of content after score animates
  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/quiz/result?s=${shareParam}`
      : "";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My relationship scored ${pulse}/100 on OmniLife!`,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scoreColor =
    pulse <= 40
      ? "text-red-400"
      : pulse <= 60
        ? "text-yellow-400"
        : pulse <= 80
          ? "text-blue-400"
          : "text-green-400";

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-background via-background to-purple-950/20 px-6 py-12">
      {/* Pulse animation ring */}
      <div className="relative mb-8 flex items-center justify-center">
        <div className="absolute h-48 w-48 animate-ping rounded-full bg-primary/10" style={{ animationDuration: "2s", animationIterationCount: "3" }} />
        <div className="relative flex h-44 w-44 flex-col items-center justify-center rounded-full border-4 border-primary/30 bg-card">
          <span className={`text-6xl font-bold tabular-nums ${scoreColor}`}>
            {displayScore}
          </span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>

      {/* Interpretation */}
      <h1 className="mb-2 text-2xl font-semibold">{interpretation}</h1>
      <p className="mb-10 max-w-sm text-center text-muted-foreground">
        Your Relationship Pulse score based on 5 key dimensions.
      </p>

      {/* Radar chart + details */}
      <div
        className={`w-full max-w-sm transition-all duration-700 ${
          showContent ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <RadarChart dimensions={dimensions} />

        {/* Dimension breakdown */}
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
        className={`mt-12 flex w-full max-w-sm flex-col gap-3 transition-all duration-700 delay-300 ${
          showContent ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <Button onClick={handleShare} variant="outline" className="w-full">
          {copied ? "Link Copied!" : "Share Your Score"}
        </Button>
        <Button
          render={<Link href="/register" />}
          className="w-full"
        >
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
    </div>
  );
}
