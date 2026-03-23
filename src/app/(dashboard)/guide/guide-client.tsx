"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  TrendingUp,
  Heart,
  Shield,
  Layers,
  Dumbbell,
  Flame,
  HelpCircle,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const SECTIONS = [
  {
    icon: Calendar,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    title: "Daily Log",
    description: "Your daily check-in takes 2–5 minutes. Rate how you feel across key areas of your life and relationship.",
    details: [
      "Quick Mode (2 min): Rate 4 key areas — mood, connection, communication, and trust",
      "Detailed Mode (5 min): Rate all 9 dimensions for deeper insights",
      "Your scores are combined into a Life Score, Relationship Score, and Overall Score",
      "Log consistently to build streaks and unlock milestones",
    ],
    action: { label: "Start logging", href: "/daily" },
  },
  {
    icon: TrendingUp,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    title: "Your Scores",
    description: "Three scores help you understand where you stand.",
    details: [
      "Life Score — how you're doing personally (energy, growth, stability, social connection)",
      "Relationship Score — how your relationship feels (emotional bond, trust, fairness, stress, personal space)",
      "Overall Score — your combined life + relationship health, adjusted for any imbalances",
    ],
    action: { label: "View dashboard", href: "/overview" },
  },
  {
    icon: TrendingUp,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    title: "Insights & Trends",
    description: "See how your scores change over time and get personalized recommendations.",
    details: [
      "Recommendations: personalized tips based on your lowest-scoring areas",
      "Balance Chart: visualize the relationship between your life and relationship scores",
      "Trends: track each dimension over days and weeks to spot patterns",
    ],
    action: { label: "See insights", href: "/insights" },
  },
  {
    icon: Dumbbell,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    title: "Exercises",
    description: "Psychology-backed activities to improve specific areas of your relationship.",
    details: [
      "Each exercise targets a specific dimension (trust, communication, fairness, etc.)",
      "Activities range from 5 to 30 minutes",
      "Based on proven therapy approaches like CBT, Gottman Method, and mindfulness",
      "Free tier includes 5 exercises; Premium unlocks all 37",
    ],
    action: { label: "Browse exercises", href: "/exercises" },
  },
  {
    icon: Layers,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    title: "Scenario Modes",
    description: "Life changes. Your scoring should adapt.",
    details: [
      "Exam/Work Crunch — more weight on personal energy and stress management",
      "New Baby — emphasizes fairness and connection",
      "Crisis Mode — focuses on trust and emotional closeness",
      "Long Distance — prioritizes communication and emotional bonding",
      "Chill Mode — balanced, lower pressure scoring",
      "Custom — set your own weights for each dimension",
    ],
    action: { label: "Switch scenario", href: "/scenarios" },
  },
  {
    icon: Heart,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    title: "Partner Features",
    description: "OmniLife works best as a couple.",
    details: [
      "Invite your partner to create linked accounts",
      "Compare your scores side-by-side to find blind spots",
      "See where you agree and where you see things differently",
      "Partner comparison is available in the Compare tab",
    ],
    action: { label: "Invite partner", href: "/partner" },
  },
  {
    icon: Shield,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    title: "Limits & Boundaries",
    description: "Set guardrails to protect what matters most.",
    details: [
      "Minimum Scores — get alerted if a dimension drops below your threshold",
      "Time Budgets — track how many hours you spend on relationship activities",
      "Energy Budgets — make sure you're not overextending yourself",
    ],
    action: { label: "Set limits", href: "/constraints" },
  },
  {
    icon: Flame,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    title: "Streaks & Milestones",
    description: "Stay motivated with daily streaks and achievement badges.",
    details: [
      "Log every day to build your streak — your streak badge shows in the header",
      "Hit milestones like 7-day streak, 30 logs, first exercise completed, and more",
      "Celebrate achievements with confetti and shareable cards",
    ],
    action: null,
  },
];

const FAQ = [
  {
    q: "What's the difference between Quick and Detailed mode?",
    a: "Quick mode asks 4 questions and takes about 2 minutes. It auto-fills the remaining dimensions using smart defaults. Detailed mode asks all 9 dimensions plus mood and energy — better for deeper self-reflection.",
  },
  {
    q: "What is the Overall Score?",
    a: "It combines your Life Score and Relationship Score into a single number (0–100). If any dimension is very low, or there's a big imbalance, the score adjusts downward — this helps you catch blind spots.",
  },
  {
    q: "Do both partners need an account?",
    a: "No — OmniLife works great solo. But if your partner joins, you unlock comparison features and can see where your perspectives align or differ.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your scores are only visible to you (and your linked partner, if you choose). We don't sell data or use it for ads. See our Privacy Policy for details.",
  },
  {
    q: "What are Scenario Modes?",
    a: "Life situations change how you should weigh different areas. During exam season, personal energy matters more. With a newborn, fairness becomes critical. Scenarios adjust the scoring weights automatically.",
  },
];

export function GuideClient() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">How It Works</h1>
        <p className="text-sm text-muted-foreground">
          Everything you need to know about using OmniLife
        </p>
      </div>

      {/* Quick start */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Quick Start</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Log your first day → see your scores → get recommendations → try an exercise. That&apos;s it.
              </p>
              <Button
                className="mt-3"
                size="sm"
                render={<Link href="/daily" />}
              >
                Start your first log
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature sections */}
      <div className="space-y-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${section.bg}`}>
                    <Icon className={`h-4 w-4 ${section.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                      <span className="text-muted-foreground">{detail}</span>
                    </li>
                  ))}
                </ul>
                {section.action && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    render={<Link href={section.action.href} />}
                  >
                    {section.action.label}
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <p className="text-sm font-medium">{item.q}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Glossary */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Score Glossary</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { term: "Life Score", def: "Average of your 4 personal dimensions (vitality, growth, security, connection)" },
            { term: "Relationship Score", def: "Average of your 5 relationship dimensions (emotional, trust, fairness, stress, personal space)" },
            { term: "Overall Score", def: "Combined life + relationship score, adjusted for imbalances and low areas" },
            { term: "Vitality", def: "Physical energy, health, and feeling alive" },
            { term: "Growth", def: "Learning, personal development, and forward momentum" },
            { term: "Security", def: "Financial and life stability, feeling safe" },
            { term: "Connection", def: "Social bonds, friendships, community" },
            { term: "Emotional", def: "Emotional closeness and intimacy with your partner" },
            { term: "Trust", def: "Confidence in your partner's reliability and intentions" },
            { term: "Fairness", def: "How equally responsibilities and effort are shared" },
            { term: "Stress", def: "How well you handle stress as a couple" },
            { term: "Personal Space", def: "Freedom to be yourself and pursue your own interests" },
          ].map((item) => (
            <div key={item.term} className="rounded-lg border p-3">
              <Badge variant="outline" className="mb-1">{item.term}</Badge>
              <p className="text-xs text-muted-foreground">{item.def}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
