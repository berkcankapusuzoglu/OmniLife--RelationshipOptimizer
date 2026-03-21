"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Flame,
  Pencil,
  Dumbbell,
  Trophy,
  Heart,
  Star,
  Crown,
  BookOpen,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Milestone } from "@/lib/milestones";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Pencil,
  Dumbbell,
  Trophy,
  Heart,
  Star,
  Crown,
  BookOpen,
};

interface MilestoneToastProps {
  milestones: Milestone[];
  onDismiss?: () => void;
}

export function MilestoneToast({ milestones, onDismiss }: MilestoneToastProps) {
  const [visible, setVisible] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [interacted, setInteracted] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const advance = useCallback(() => {
    if (currentIdx < milestones.length - 1) {
      setCurrentIdx((i) => i + 1);
      setInteracted(false);
    } else {
      dismiss();
    }
  }, [currentIdx, milestones.length, dismiss]);

  // Auto-dismiss after 10 seconds if not interacted with
  useEffect(() => {
    if (milestones.length === 0 || interacted) return;

    const timer = setTimeout(() => {
      advance();
    }, 10000);

    return () => clearTimeout(timer);
  }, [currentIdx, milestones.length, interacted, advance]);

  const handleShare = useCallback(async () => {
    setInteracted(true);
    const milestone = milestones[currentIdx];
    const shareText = `I just unlocked "${milestone.name}" on OmniLife! ${milestone.percentile ? milestone.percentile + "." : ""} ${milestone.description}.`;
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/milestone?m=${milestone.id}`
        : "https://omnilife.app";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${milestone.name} — OmniLife`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    } catch {
      // Clipboard failed silently
    }
  }, [milestones, currentIdx]);

  if (!visible || milestones.length === 0) return null;

  const milestone = milestones[currentIdx];
  const IconComponent = ICON_MAP[milestone.icon] ?? Star;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={advance}
      />

      {/* CSS-only confetti */}
      <div className="confetti-container absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece absolute"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2.5 + Math.random() * 3}s`,
              width: `${6 + Math.random() * 6}px`,
              height: `${6 + Math.random() * 6}px`,
              backgroundColor: [
                "#f43f5e",
                "#8b5cf6",
                "#3b82f6",
                "#22c55e",
                "#eab308",
                "#f97316",
                "#ec4899",
                "#14b8a6",
              ][i % 8],
              borderRadius: i % 3 === 0 ? "50%" : "2px",
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      {/* Modal card */}
      <div className="relative z-10 animate-in zoom-in-95 fade-in duration-500 w-full max-w-md mx-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-card to-card/95 p-8 shadow-2xl text-center">
          {/* Close button */}
          <button
            onClick={advance}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-2 ring-purple-500/30">
            <IconComponent className="h-10 w-10 text-purple-400" />
          </div>

          {/* Milestone name in gradient text */}
          <h2
            className="text-3xl font-bold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #a78bfa, #60a5fa, #34d399)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {milestone.name}!
          </h2>

          {/* Description */}
          <p className="mt-3 text-muted-foreground">
            {milestone.description}
          </p>

          {/* Percentile */}
          {milestone.percentile && (
            <p className="mt-2 text-sm font-medium text-purple-400">
              {milestone.percentile}
            </p>
          )}

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3">
            <Button
              onClick={handleShare}
              className="w-full h-12 text-base font-semibold text-white border-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              }}
            >
              <Share2 className="mr-2 h-5 w-5" />
              Share This Achievement
            </Button>
            <Button
              variant="ghost"
              onClick={advance}
              className="w-full text-muted-foreground"
            >
              Continue
            </Button>
          </div>

          {/* Progress dots if multiple milestones */}
          {milestones.length > 1 && (
            <div className="mt-4 flex justify-center gap-1.5">
              {milestones.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === currentIdx ? "bg-purple-400" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .confetti-piece {
          top: -20px;
          opacity: 0;
          animation: confetti-fall linear forwards;
        }
        @keyframes confetti-fall {
          0% {
            top: -20px;
            opacity: 1;
            transform: rotateZ(0deg) translateX(0);
          }
          25% {
            opacity: 1;
            transform: rotateZ(180deg) translateX(15px);
          }
          50% {
            opacity: 0.8;
            transform: rotateZ(360deg) translateX(-10px);
          }
          75% {
            opacity: 0.5;
            transform: rotateZ(540deg) translateX(5px);
          }
          100% {
            top: 100%;
            opacity: 0;
            transform: rotateZ(720deg) translateX(-5px);
          }
        }
      `}</style>
    </div>
  );
}
