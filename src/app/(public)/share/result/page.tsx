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

export async function generateMetadata({ searchParams }: ShareResultPageProps): Promise<Metadata> {
  const params = await searchParams;
  const total = params.total ?? "50";
  const life = params.life ?? "50";
  const rel = params.rel ?? "50";
  const date = params.date ?? new Date().toISOString().split("T")[0];

  const ogUrl = `/api/og?life=${life}&rel=${rel}&total=${total}&date=${date}`;
  const title = `My Score: ${total}/100 - OmniLife`;
  const description = `Life Score: ${life} | Relationship Score: ${rel} | Take the free quiz at OmniLife`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `OmniLife Score: ${total}/100` }],
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
  const total = Number(params.total ?? "50");
  const life = Number(params.life ?? "50");
  const rel = Number(params.rel ?? "50");
  const date = params.date ?? new Date().toISOString().split("T")[0];

  let pillars: { vitality: number; growth: number; security: number; connection: number } | undefined;
  let relDims: { emotional: number; trust: number; fairness: number; stress: number; autonomy: number } | undefined;

  if (params.p) {
    const parts = params.p.split(",").map(Number);
    if (parts.length === 4) {
      pillars = { vitality: parts[0], growth: parts[1], security: parts[2], connection: parts[3] };
    }
  }
  if (params.r) {
    const parts = params.r.split(",").map(Number);
    if (parts.length === 5) {
      relDims = { emotional: parts[0], trust: parts[1], fairness: parts[2], stress: parts[3], autonomy: parts[4] };
    }
  }

  return (
    <ShareResultClient
      totalQuality={total}
      lifeScore={life}
      relScore={rel}
      date={date}
      pillars={pillars ?? undefined}
      relDims={relDims ?? undefined}
    />
  );
}
