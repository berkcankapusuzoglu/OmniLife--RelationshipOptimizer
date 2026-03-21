"use client";

import { useEffect, useState } from "react";
import {
  Flame,
  Pencil,
  Dumbbell,
  Trophy,
  Heart,
  Star,
  Crown,
  BookOpen,
} from "lucide-react";
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

  useEffect(() => {
    if (milestones.length === 0) return;

    const timer = setTimeout(() => {
      if (currentIdx < milestones.length - 1) {
        setCurrentIdx((i) => i + 1);
      } else {
        setVisible(false);
        onDismiss?.();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentIdx, milestones.length, onDismiss]);

  if (!visible || milestones.length === 0) return null;

  const milestone = milestones[currentIdx];
  const IconComponent = ICON_MAP[milestone.icon] ?? Star;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Confetti */}
      <div className="confetti-container absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece absolute"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              backgroundColor: [
                "#f43f5e",
                "#8b5cf6",
                "#3b82f6",
                "#22c55e",
                "#eab308",
                "#f97316",
              ][i % 6],
            }}
          />
        ))}
      </div>

      {/* Toast card */}
      <div
        className="pointer-events-auto animate-in zoom-in-95 fade-in duration-300 rounded-xl border bg-card p-6 shadow-2xl text-center max-w-sm"
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <IconComponent className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{milestone.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {milestone.description}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Tap to dismiss
        </p>
      </div>

      <style jsx>{`
        .confetti-piece {
          width: 8px;
          height: 8px;
          top: -10px;
          opacity: 0;
          border-radius: 2px;
          animation: confetti-fall linear forwards;
        }
        @keyframes confetti-fall {
          0% {
            top: -10px;
            opacity: 1;
            transform: rotateZ(0deg);
          }
          100% {
            top: 100%;
            opacity: 0;
            transform: rotateZ(720deg);
          }
        }
      `}</style>
    </div>
  );
}
