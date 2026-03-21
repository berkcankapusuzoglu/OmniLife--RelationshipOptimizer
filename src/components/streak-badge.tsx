"use client";

import { Flame } from "lucide-react";

interface StreakBadgeProps {
  currentStreak: number;
}

function getStreakColor(streak: number): string {
  if (streak >= 30) return "text-yellow-400";
  if (streak >= 14) return "text-purple-400";
  if (streak >= 7) return "text-red-400";
  if (streak >= 1) return "text-orange-400";
  return "text-muted-foreground";
}

function getFlameScale(streak: number): string {
  if (streak >= 30) return "scale-125";
  if (streak >= 14) return "scale-115";
  if (streak >= 7) return "scale-110";
  return "scale-100";
}

export function StreakBadge({ currentStreak }: StreakBadgeProps) {
  if (currentStreak <= 0) return null;

  const color = getStreakColor(currentStreak);
  const scale = getFlameScale(currentStreak);

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-sm font-medium">
      <Flame
        className={`h-4 w-4 ${color} ${scale} transition-transform duration-300`}
        style={{
          animation: currentStreak >= 7 ? "streak-pulse 1.5s ease-in-out infinite" : undefined,
        }}
      />
      <span className={color}>
        {currentStreak} day{currentStreak !== 1 ? "s" : ""}
      </span>
      <style jsx>{`
        @keyframes streak-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
