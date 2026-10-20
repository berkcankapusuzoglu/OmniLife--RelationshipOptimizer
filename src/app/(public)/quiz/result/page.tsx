import type { Metadata } from "next";
import { ResultClient } from "./result-client";
import {
  QUIZ_DIMENSIONS,
  QUIZ_DIMENSION_LABELS,
  buildQuizOgPath,
  computePulse,
  decodeQuizScores,
  getArchetype,
  getPulseLabel,
  toQuizScores,
} from "@/lib/quiz";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const s = typeof sp.s === "string" ? sp.s : "";
  const scores = decodeQuizScores(s);
  const pulse = scores ? computePulse(scores) : null;
  const archetype = scores ? getArchetype(toQuizScores(scores)) : null;

  const title = pulse
    ? `My relationship scored ${pulse}/100 on Couplemetric!`
    : "Relationship Quiz Result — Couplemetric";

  const ogPath = pulse && archetype ? buildQuizOgPath(pulse, archetype.name) : null;

  return {
    title,
    description: pulse && archetype
      ? `I’m ${archetype.name}: ${pulse}/100 on the Couplemetric Relationship Pulse quiz. Take the free quiz and see how your relationship compares!`
      : "See your Relationship Pulse score. Take the free quiz at Couplemetric.",
    openGraph: {
      title: pulse
        ? `My relationship scored ${pulse}/100 on Couplemetric! Take the free quiz.`
        : "Relationship Quiz Result — Couplemetric",
      description:
        "How strong is your relationship? Find out in 60 seconds with our free quiz.",
      ...(ogPath
        ? {
            images: [
              {
                url: ogPath,
                width: 1200,
                height: 630,
                alt: `Couplemetric Relationship Pulse: ${pulse}/100 — ${archetype?.name}`,
              },
            ],
          }
        : {}),
    },
    ...(ogPath
      ? {
          twitter: {
            card: "summary_large_image" as const,
            title: `My relationship scored ${pulse}/100 on Couplemetric!`,
            images: [ogPath],
          },
        }
      : {}),
  };
}

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const s = typeof sp.s === "string" ? sp.s : "";
  const scores = decodeQuizScores(s);

  if (!scores) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-semibold">Invalid Quiz Result</h1>
          <p className="mb-6 text-muted-foreground">
            This link doesn&apos;t contain valid quiz scores.
          </p>
          <a
            href="/quiz"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Take the Quiz
          </a>
        </div>
      </div>
    );
  }

  const pulse = computePulse(scores);
  const dimensions = QUIZ_DIMENSIONS.map((key, i) => ({
    key,
    label: QUIZ_DIMENSION_LABELS[key],
    value: scores[i],
  }));

  return (
    <ResultClient
      pulse={pulse}
      interpretation={getPulseLabel(pulse)}
      dimensions={dimensions}
      shareParam={s}
    />
  );
}
