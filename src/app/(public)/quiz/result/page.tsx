import type { Metadata } from "next";
import { ResultClient } from "./result-client";

function decodeScores(encoded: string): number[] | null {
  try {
    const decoded = atob(encoded);
    const scores = decoded.split(",").map(Number);
    if (scores.length !== 5 || scores.some((s) => isNaN(s) || s < 1 || s > 10))
      return null;
    return scores;
  } catch {
    return null;
  }
}

function getInterpretation(score: number) {
  if (score <= 40) return { label: "Needs Attention", emoji: "" };
  if (score <= 60) return { label: "Room to Grow", emoji: "" };
  if (score <= 80) return { label: "Strong Foundation", emoji: "" };
  return { label: "Thriving", emoji: "" };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const s = typeof sp.s === "string" ? sp.s : "";
  const scores = decodeScores(s);
  const pulse = scores
    ? Math.round(scores.reduce((a, b) => a + b, 0) * 2)
    : null;

  const title = pulse
    ? `My relationship scored ${pulse}/100 on OmniLife!`
    : "Relationship Quiz Result — OmniLife";

  return {
    title,
    description: pulse
      ? `I scored ${pulse}/100 on the OmniLife Relationship Pulse quiz. Take the free quiz and see how your relationship compares!`
      : "See your Relationship Pulse score. Take the free quiz at OmniLife.",
    openGraph: {
      title: pulse
        ? `My relationship scored ${pulse}/100 on OmniLife! Take the free quiz.`
        : "Relationship Quiz Result — OmniLife",
      description:
        "How strong is your relationship? Find out in 60 seconds with our free quiz.",
    },
  };
}

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const s = typeof sp.s === "string" ? sp.s : "";
  const scores = decodeScores(s);

  if (!scores) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
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

  const pulse = Math.round(scores.reduce((a, b) => a + b, 0) * 2);
  const interpretation = getInterpretation(pulse);
  const dimensionLabels = [
    "Emotional",
    "Fairness",
    "Trust",
    "Growth",
    "Stress",
  ];
  const dimensions = dimensionLabels.map((label, i) => ({
    label,
    value: scores[i],
  }));

  return (
    <ResultClient
      pulse={pulse}
      interpretation={interpretation.label}
      dimensions={dimensions}
      shareParam={s}
    />
  );
}
