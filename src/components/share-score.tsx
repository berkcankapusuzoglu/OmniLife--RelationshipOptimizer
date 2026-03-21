"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";

interface ShareScoreProps {
  totalQuality: number;
  lifeScore: number;
  relScore: number;
  date: string;
  pillars?: {
    vitality: number;
    growth: number;
    security: number;
    connection: number;
  };
  relDims?: {
    emotional: number;
    trust: number;
    fairness: number;
    stress: number;
    autonomy: number;
  };
}

function buildShareUrl(props: ShareScoreProps): string {
  const params = new URLSearchParams({
    life: props.lifeScore.toFixed(0),
    rel: props.relScore.toFixed(0),
    total: props.totalQuality.toFixed(0),
    date: props.date,
  });
  if (props.pillars) {
    params.set("p", [
      props.pillars.vitality,
      props.pillars.growth,
      props.pillars.security,
      props.pillars.connection,
    ].join(","));
  }
  if (props.relDims) {
    params.set("r", [
      props.relDims.emotional,
      props.relDims.trust,
      props.relDims.fairness,
      props.relDims.stress,
      props.relDims.autonomy,
    ].join(","));
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "https://omnilife.app";
  return `${origin}/share/result?${params.toString()}`;
}

export function ShareScore(props: ShareScoreProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(props);
    const shareText = `My relationship scored ${props.totalQuality.toFixed(0)}/100 on OmniLife! Take the free quiz:`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "My OmniLife Score",
          text: shareText,
          url,
        });
        return;
      } catch {
        // User cancelled or share failed, fall through to copy
      }
    }

    // Fallback: copy link
    try {
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed silently
    }
  }, [props]);

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4 text-emerald-400" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="mr-2 h-4 w-4" />
          Share Score
        </>
      )}
    </Button>
  );
}
