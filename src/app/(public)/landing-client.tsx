"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Brain,
  Heart,
  Shield,
  TrendingUp,
  Sparkles,
  ArrowRight,
  CheckCircle,
  BarChart3,
  Target,
} from "lucide-react";

function AnimatedCounter({
  target,
  suffix = "",
  duration = 2000,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = performance.now();

          function animate(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(target * eased));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          }

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasAnimated, target, duration]);

  return (
    <span ref={ref} className="font-mono text-4xl font-bold text-primary">
      {count}
      {suffix}
    </span>
  );
}

const features = [
  {
    icon: Brain,
    title: "9 Life Dimensions",
    description:
      "Track vitality, growth, security, connection, and 5 relationship dimensions daily.",
  },
  {
    icon: BarChart3,
    title: "Scoring Engine",
    description:
      "Weighted pillars, penalty systems, and Pareto-optimal recommendations powered by math.",
  },
  {
    icon: Target,
    title: "Scenario Modes",
    description:
      "Exam season, career crisis, new relationship — adapt your optimization weights instantly.",
  },
  {
    icon: Shield,
    title: "Constraint System",
    description:
      "Set redlines and budgets. Quadratic penalties ensure you never sacrifice what matters most.",
  },
  {
    icon: TrendingUp,
    title: "Insights & Trends",
    description:
      "7-day sparklines, radar charts, and trend analysis show your trajectory at a glance.",
  },
  {
    icon: Sparkles,
    title: "Guided Exercises",
    description:
      "Psychology-backed exercises matched to your current scores and active scenario.",
  },
];

const stats = [
  { value: 9, suffix: "", label: "Life Dimensions" },
  { value: 6, suffix: "", label: "Scenario Modes" },
  { value: 100, suffix: "", label: "Quality Score Range" },
];

export function LandingClient() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            OmniLife
          </Link>
          <nav className="flex items-center gap-2" aria-label="Main navigation">
            <Button variant="ghost" render={<Link href="/login" />}>
              Sign in
            </Button>
            <Button render={<Link href="/register" />}>
              Get Started
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-20 text-center sm:pb-24 sm:pt-32">
        <Badge variant="secondary" className="mb-6">
          <Activity className="mr-1.5 h-3 w-3" />
          Multi-objective life optimization
        </Badge>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Optimize your life{" "}
          <span className="text-primary">&amp; relationships</span> with math
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Track 9 dimensions, set constraints, and get personalized
          recommendations. Psychology, philosophy, and mathematics working
          together to maximize your Total Quality score.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" render={<Link href="/register" />}>
            Start Optimizing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/login" />}>
            Sign In
          </Button>
        </div>
      </section>

      <Separator />

      {/* Stats */}
      <section
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20"
        aria-label="Key statistics"
      >
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-2 text-center">
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Features */}
      <section
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24"
        aria-label="Features"
      >
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to optimize
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A comprehensive system grounded in science and math.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-muted">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* How it works */}
      <section
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24"
        aria-label="How it works"
      >
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Log daily",
              description:
                "Rate your 9 life dimensions each day. It takes less than 2 minutes.",
              icon: Heart,
            },
            {
              step: "2",
              title: "Get scored",
              description:
                "Our engine computes Life Score, Relationship Score, and Total Quality with penalty adjustments.",
              icon: BarChart3,
            },
            {
              step: "3",
              title: "Improve",
              description:
                "Follow personalized recommendations and exercises matched to your scenario.",
              icon: TrendingUp,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {item.step}
                </div>
                <Icon className="mb-3 h-6 w-6 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Scoring explanation */}
      <section
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24"
        aria-label="Scoring system"
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            The math behind it
          </h2>

          <div className="space-y-4">
            {[
              "Life Score = weighted average of 4 pillars (vitality, growth, security, connection)",
              "Relationship Score = weighted average of 5 dimensions (emotional, trust, fairness, stress, autonomy)",
              "Total Quality = alpha * Life + beta * Rel - penalties",
              "Penalties: redline violations (quadratic), imbalance (variance), budget overruns (linear)",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:py-24">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to optimize?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Start tracking your life dimensions today. Free and open source.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" render={<Link href="/register" />}>
            Create Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/login" />}>
            Sign In
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
          <p className="text-sm text-muted-foreground">
            OmniLife Relationship Optimizer
          </p>
          <nav className="flex gap-4" aria-label="Footer navigation">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Register
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
