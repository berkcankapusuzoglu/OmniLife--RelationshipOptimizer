"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Features } from "@/lib/subscription/tiers";
import { FEATURE_LABELS, FEATURE_DESCRIPTIONS } from "@/lib/subscription/tiers";

interface PremiumGateProps {
  userTier: string;
  feature: keyof Features;
  children: React.ReactNode;
}

export function PremiumGate({ userTier, feature, children }: PremiumGateProps) {
  if (userTier === "premium") {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none" aria-hidden="true">
        <div className="blur-[6px] opacity-40 saturate-50">{children}</div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="mx-4 flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-purple-500/20 bg-card/95 px-8 py-8 text-center shadow-2xl shadow-purple-500/5 backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
            <Lock className="h-6 w-6 text-purple-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {FEATURE_LABELS[feature]}
            </h3>
            <p className="text-sm text-muted-foreground">
              {FEATURE_DESCRIPTIONS[feature]}
            </p>
          </div>
          <Button
            render={<Link href="/pricing" />}
            className="bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-500 hover:to-violet-500"
          >
            Upgrade to Premium
          </Button>
          <p className="text-xs text-muted-foreground">
            Starting at $7.99/mo
          </p>
        </div>
      </div>
    </div>
  );
}
