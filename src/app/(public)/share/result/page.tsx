import type { Metadata } from "next";
import { ShareResultClient } from "./share-result-client";

interface ShareResultPageProps {
  searchParams: Promise<{
    life?: string;
    rel?: string;
    total?: string;
    date?: string;
    p?: string;
    r?: string;
  }>;
}

function clampScore(raw: string | undefined, fallback = 50): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** The date is the sharer's local YYYY-MM-DD, supplied by their browser; never recomputed in UTC here. */
function safeDate(raw: string | undefined): string {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

export async function generateMetadata({ searchParams }: ShareResultPageProps): Promise<Metadata> {
  const params = await searchParams;
  const total = clampScore(params.total);
  const life = clampScore(params.life);
  const rel = clampScore(params.rel);
  const date = safeDate(params.date);

  const og = new URLSearchParams({ life: String(life), rel: String(rel), total: String(total) });
  if (date) og.set("date", date);
  const ogUrl = `/api/og?${og.toString()}`;
  const title = `My Score: ${total}/100 - Couplemetric`;
  const description = `Life Score: ${life} | Relationship Score: ${rel} | Take the free quiz at Couplemetric`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `Couplemetric Score: ${total}/100` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function ShareResultPage({ searchParams }: ShareResultPageProps) {
  const params = await searchParams;
  const total = clampScore(params.total);
  const life = clampScore(params.life);
  const rel = clampScore(params.rel);
  const date = safeDate(params.date);

  let pillars: { vitality: number; growth: number; security: number; connection: number } | undefined;
  let relDims: { emotional: number; trust: number; fairness: number; stress: number; autonomy: number } | undefined;

  if (params.p) {
    const parts = params.p.split(",").map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      pillars = { vitality: parts[0], growth: parts[1], security: parts[2], connection: parts[3] };
    }
  }
  if (params.r) {
    const parts = params.r.split(",").map(Number);
    if (parts.length === 5 && parts.every(Number.isFinite)) {
      relDims = { emotional: parts[0], trust: parts[1], fairness: parts[2], stress: parts[3], autonomy: parts[4] };
    }
  }

  return (
    <ShareResultClient
      totalQuality={total}
      lifeScore={life}
      relScore={rel}
      date={date}
      pillars={pillars}
      relDims={relDims}
    />
  );
}
