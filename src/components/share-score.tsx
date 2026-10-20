"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";
import { shareCard, type ShareCardResult } from "@/lib/capacitor/share";
import { getSiteUrl } from "@/lib/site-url";

interface ShareScoreProps {
  totalQuality: number;
  lifeScore: number;
  relScore: number;
  /** Local YYYY-MM-DD shown on the card; defaults to the viewer's local date at share time. */
  date?: string;
  streak?: number;
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

/** YYYY-MM-DD in the viewer's own timezone (never `toISOString`, which is UTC). */
export function formatLocalDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildShareUrl(props: ShareScoreProps, date: string): string {
  const params = new URLSearchParams({
    life: props.lifeScore.toFixed(0),
    rel: props.relScore.toFixed(0),
    total: props.totalQuality.toFixed(0),
    date,
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
  const origin = typeof window !== "undefined" ? window.location.origin : getSiteUrl();
  return `${origin}/share/result?${params.toString()}`;
}

/** The share copy leads with the Relationship score (the number the card is about). */
export function buildShareText(props: Pick<ShareScoreProps, "relScore" | "streak">): string {
  const streakText = props.streak && props.streak > 0 ? ` (\u{1F525} ${props.streak}-day streak)` : "";
  return `My relationship scored ${props.relScore.toFixed(0)}/100${streakText} on Couplemetric! Take the free quiz:`;
}

const NOTICES: Partial<Record<ShareCardResult, string>> = {
  copied: "Link copied to clipboard",
  failed: "Couldn’t share — try copying the page link",
};

export function ShareScore(props: ShareScoreProps) {
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => { pending.forEach(clearTimeout); };
  }, []);

  const handleShare = useCallback(async () => {
    if (inFlight.current) return; // one share sheet at a time, however fast the taps
    inFlight.current = true;
    setBusy(true);
    try {
      const date = props.date ?? formatLocalDate();
      const result = await shareCard({
        title: "My Couplemetric Score",
        text: buildShareText(props),
        url: buildShareUrl(props, date),
      });
      if (result === "copied") {
        setCopied(true);
        timers.current.push(setTimeout(() => setCopied(false), 2000));
      }
      const message = NOTICES[result];
      if (message) {
        setNotice(message);
        timers.current.push(setTimeout(() => setNotice(null), 2500));
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [props]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleShare} disabled={busy} aria-busy={busy}>
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
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg"
        >
          {notice}
        </div>
      )}
    </>
  );
}
