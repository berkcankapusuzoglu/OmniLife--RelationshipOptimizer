import type { Metadata } from "next";
import Link from "next/link";
import { MILESTONE_PERCENTILES } from "@/lib/milestones";

const MILESTONE_NAMES: Record<string, { name: string; description: string; icon: string }> = {
  first_log: { name: "First Steps", description: "Submitted their first daily log", icon: "\u270F\uFE0F" },
  streak_7: { name: "Week Warrior", description: "Maintained a 7-day relationship check-in streak", icon: "\uD83D\uDD25" },
  streak_14: { name: "Fortnight Force", description: "Maintained a 14-day relationship check-in streak", icon: "\uD83D\uDD25" },
  streak_30: { name: "Monthly Master", description: "Maintained a 30-day relationship check-in streak", icon: "\uD83D\uDD25" },
  first_exercise: { name: "Getting Active", description: "Completed their first relationship exercise", icon: "\uD83D\uDCAA" },
  exercises_10: { name: "Exercise Enthusiast", description: "Completed 10 relationship exercises", icon: "\uD83C\uDFC6" },
  partner_linked: { name: "Better Together", description: "Linked with their partner", icon: "\u2764\uFE0F" },
  score_80: { name: "High Achiever", description: "Reached a total quality score above 80", icon: "\u2B50" },
  score_90: { name: "Elite Optimizer", description: "Reached a total quality score above 90", icon: "\uD83D\uDC51" },
  first_weekly: { name: "Reflective Mind", description: "Completed their first weekly check-in", icon: "\uD83D\uDCD6" },
};

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const milestoneId = (typeof sp.m === "string" ? sp.m : "streak_7");
  const streak = typeof sp.streak === "string" ? sp.streak : "";
  const name = typeof sp.name === "string" ? sp.name : "";

  const info = MILESTONE_NAMES[milestoneId] ?? { name: "Achievement Unlocked", description: "Unlocked a milestone on OmniLife" };
  const title = name ? `${name} unlocked ${info.name}!` : `${info.name} — OmniLife`;
  const description = `${info.description}. ${MILESTONE_PERCENTILES[milestoneId] ?? ""}`;

  const ogParams = new URLSearchParams({ milestone: milestoneId });
  if (streak) ogParams.set("streak", streak);
  if (name) ogParams.set("name", name);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/api/og/milestone?${ogParams.toString()}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/milestone?${ogParams.toString()}`],
    },
  };
}

export default async function MilestonePage({ searchParams }: Props) {
  const sp = await searchParams;
  const milestoneId = (typeof sp.m === "string" ? sp.m : "streak_7");
  const streak = typeof sp.streak === "string" ? sp.streak : "";
  const name = typeof sp.name === "string" ? sp.name : "";

  const info = MILESTONE_NAMES[milestoneId] ?? {
    name: "Achievement Unlocked",
    description: "Unlocked a milestone on OmniLife",
    icon: "\uD83C\uDFC6",
  };
  const percentile = MILESTONE_PERCENTILES[milestoneId] ?? "";

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-2 ring-purple-500/30">
          <span className="text-5xl">{info.icon}</span>
        </div>

        {/* Name attribution */}
        {name && (
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            {name} just unlocked
          </p>
        )}

        {/* Milestone name */}
        <h1
          className="text-4xl font-bold tracking-tight sm:text-5xl"
          style={{
            background: "linear-gradient(135deg, #a78bfa, #60a5fa, #34d399)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {info.name}!
        </h1>

        {/* Description */}
        <p className="mt-4 text-lg text-muted-foreground">
          {info.description}
        </p>

        {/* Streak badge */}
        {streak && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-2 text-orange-400">
            <span className="text-xl">{"\uD83D\uDD25"}</span>
            <span className="font-semibold">{streak}-day streak</span>
          </div>
        )}

        {/* Percentile */}
        {percentile && (
          <p className="mt-4 text-sm font-medium text-purple-400">
            {percentile}
          </p>
        )}

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <Link
            href="/quiz"
            className="inline-flex h-12 items-center justify-center rounded-xl px-8 text-base font-semibold text-white transition-colors"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            }}
          >
            Start your own streak — Take the Free Quiz
          </Link>
          <Link
            href="/register"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Or sign up directly
          </Link>
        </div>
      </div>
    </div>
  );
}
