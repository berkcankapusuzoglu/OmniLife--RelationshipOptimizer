"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useNativePlatform } from "@/lib/capacitor/platform";
import { TIERS, type Features, type SubscriptionTier, FEATURE_LABELS, FEATURE_DESCRIPTIONS } from "@/lib/subscription/tiers";

interface PremiumGateProps {
  userTier: string;
  feature: keyof Features;
  children?: React.ReactNode;
}

/**
 * Static placeholder shown in place of locked content. Deliberately not
 * derived from real data: locked sections receive no data from the server,
 * so there is nothing to blur and nothing to leak.
 */
function LockedIllustration() {
  const bars = [38, 56, 48, 70, 62, 82, 76];
  return (
    <svg
      viewBox="0 0 280 120"
      className="h-28 w-full max-w-xs text-purple-400/40"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="16" y1="104" x2="264" y2="104" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
      {bars.map((height, index) => (
        <rect
          key={index}
          x={24 + index * 34}
          y={104 - height}
          width="20"
          height={height}
          rx="4"
          fill="currentColor"
        />
      ))}
      <polyline
        points="34,70 68,52 102,60 136,36 170,44 204,24 238,30"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.9"
      />
    </svg>
  );
}

export function PremiumGate({ userTier, feature, children }: PremiumGateProps) {
  const native = useNativePlatform();
  const tierKey = (userTier in TIERS ? userTier : "free") as SubscriptionTier;
  const config = TIERS[tierKey].features;
  const value = config[feature];
  const allowed = typeof value === "boolean" ? value : (value as number) > 0;

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-purple-500/20 bg-card px-6 py-8 text-center">
      <LockedIllustration />
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
        <Lock className="h-6 w-6 text-purple-400" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{FEATURE_LABELS[feature]}</h3>
        <p className="text-sm text-muted-foreground">{FEATURE_DESCRIPTIONS[feature]}</p>
      </div>
      {native === false ? (
        <>
          <Button
            render={<Link href="/pricing" />}
            className="bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-500 hover:to-violet-500"
          >
            Upgrade to Premium
          </Button>
          <p className="text-xs text-muted-foreground">
            ${TIERS.premium.monthlyPrice}/mo or ${TIERS.premium.yearlyPrice}/yr. One plan covers both partners.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">This feature is not available for your account.</p>
      )}
    </div>
  );
}
