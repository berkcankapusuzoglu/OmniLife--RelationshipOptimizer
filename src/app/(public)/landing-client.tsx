"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  BarChart3,
  Brain,
  Users,
  Lightbulb,
  ListChecks,
  ClipboardEdit,
  TrendingUp,
  Sparkles,
  Check,
  ArrowRight,
  ChevronRight,
  Zap,
  Activity,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsletterSignup } from "@/components/newsletter-signup";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TIERS } from "@/lib/subscription/tiers";
import { useNativePlatform } from "@/lib/capacitor/platform";

// ─── Animated Counter ────────────────────────────────────────────────
function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 2000,
  decimals = 0,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    hasAnimated.current = false;
    const el = ref.current;
    if (!el || hasAnimated.current) return;

    const runAnimation = () => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const val = eased * target;
        setCount(decimals > 0 ? parseFloat(val.toFixed(decimals)) : Math.floor(val));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    // If already visible, animate immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      runAnimation();
      return;
    }

    // Otherwise wait for visibility
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          runAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, decimals]);

  return (
    <span ref={ref}>
      {prefix}
      {decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Fade-in Section ─────────────────────────────────────────────────
function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Animated Hero Score Preview ─────────────────────────────────────
const scoreDimensions = [
  { label: "Vitality", before: 52, after: 82, color: "bg-violet-500", colorBefore: "bg-red-400" },
  { label: "Growth", before: 45, after: 71, color: "bg-blue-500", colorBefore: "bg-red-400" },
  { label: "Security", before: 60, after: 88, color: "bg-cyan-500", colorBefore: "bg-red-400" },
  { label: "Connection", before: 48, after: 76, color: "bg-teal-500", colorBefore: "bg-red-400" },
  { label: "Emotional", before: 50, after: 79, color: "bg-emerald-500", colorBefore: "bg-red-400" },
  { label: "Trust", before: 58, after: 85, color: "bg-violet-400", colorBefore: "bg-red-400" },
  { label: "Fairness", before: 42, after: 68, color: "bg-blue-400", colorBefore: "bg-red-400" },
  { label: "Stress", before: 55, after: 74, color: "bg-cyan-400", colorBefore: "bg-red-400" },
  { label: "Space", before: 53, after: 81, color: "bg-teal-400", colorBefore: "bg-red-400" },
];

function HeroScorePreview() {
  const [showAfter, setShowAfter] = useState(false);
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Start with "before" state, then auto-toggle to "after"
          setTimeout(() => setAnimated(true), 300);
          setTimeout(() => setShowAfter(true), 2000);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const totalBefore = 54;
  const totalAfter = 78.4;

  return (
    <div ref={ref} className="relative mx-auto mt-16 max-w-3xl">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/20 via-blue-500/20 to-teal-500/20 blur-xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-8 backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Overall Relationship Score
            </p>
            <div className="flex items-baseline gap-3">
              <p
                className={`text-5xl font-bold tracking-tight bg-clip-text text-transparent transition-all duration-1000 ${
                  showAfter
                    ? "bg-gradient-to-r from-violet-400 to-teal-400"
                    : "bg-gradient-to-r from-red-400 to-orange-400"
                }`}
              >
                {animated ? (
                  showAfter ? (
                    <AnimatedCounter target={totalAfter} duration={1500} decimals={1} />
                  ) : (
                    <AnimatedCounter target={totalBefore} duration={1500} decimals={0} />
                  )
                ) : (
                  "0"
                )}
              </p>
              {showAfter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-sm font-semibold text-emerald-400 animate-in fade-in slide-in-from-left-2 duration-500">
                  +24.4 pts
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAfter(false)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                !showAfter
                  ? "bg-red-500/20 text-red-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Before
            </button>
            <button
              onClick={() => setShowAfter(true)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                showAfter
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              After
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-9">
          {scoreDimensions.map((dim, i) => {
            const value = showAfter ? dim.after : dim.before;
            const barColor = showAfter ? dim.color : dim.colorBefore;
            return (
              <div key={dim.label} className="text-center">
                <div className="mx-auto mb-1 h-16 w-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`${barColor} w-full rounded-full transition-all duration-1000 ease-out`}
                    style={{
                      height: animated ? `${value}%` : "0%",
                      marginTop: animated ? `${100 - value}%` : "100%",
                      transitionDelay: `${i * 100}ms`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {dim.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sticky CTA Bar ──────────────────────────────────────────────────
function StickyCTABar() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (dismissed || !show) return null;

  return (
    <>
      {/* Desktop: top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 hidden sm:block transition-all duration-300 translate-y-0">
        <div className="border-b border-white/10 bg-card/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2.5">
            <p className="text-sm font-medium">
              Take the Free Quiz — 60 seconds to your score
            </p>
            <div className="flex items-center gap-3">
              <Button size="sm" render={<Link href="/quiz" />}>
                Start Free Quiz
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
              <button
                onClick={() => setDismissed(true)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile: bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
        <div className="border-t border-white/10 bg-card/95 backdrop-blur-md px-4 py-3">
          <div className="flex items-center gap-3">
            <Button size="sm" className="flex-1" render={<Link href="/quiz" />}>
              Free Quiz — 60s to your score
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Data ────────────────────────────────────────────────────────────
const steps = [
  {
    icon: ClipboardEdit,
    title: "Log Daily",
    description:
      "Answer quick questions about your day, mood, and relationship interactions. Takes under 2 minutes.",
  },
  {
    icon: BarChart3,
    title: "Get Scored",
    description:
      "Our engine computes scores across 9 dimensions covering your life quality and relationship health.",
  },
  {
    icon: TrendingUp,
    title: "Improve Together",
    description:
      "Receive personalized exercises and insights backed by psychology research. Track your growth over time.",
  },
];

const features = [
  {
    icon: Activity,
    title: "9-Dimension Scoring",
    description:
      "Life score (vitality, growth, security, connection) and relationship score (emotional, trust, fairness, stress, personal space) combine into one overall score.",
    gradient: "from-violet-500 to-blue-500",
  },
  {
    icon: Brain,
    title: "37 Psychology Exercises",
    description:
      "Curated interventions from CBT, Gottman Method, attachment theory, and more. Matched to your specific weak spots.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Zap,
    title: "Scenario Modes",
    description:
      "Exam season? New baby? Job crisis? Activate a scenario to automatically rebalance scoring weights and recommendations.",
    gradient: "from-cyan-500 to-teal-500",
  },
  {
    icon: Users,
    title: "Partner Linking",
    description:
      "Connect with your partner to share scores, compare perspectives, and work on joint exercises together.",
    gradient: "from-teal-500 to-emerald-500",
  },
  {
    icon: Lightbulb,
    title: "Smart Insights",
    description:
      "See which 20% of changes will drive 80% of improvement. Weekly trend analysis with actionable takeaways.",
    gradient: "from-emerald-500 to-violet-500",
  },
  {
    icon: ListChecks,
    title: "Household Tasks",
    description:
      "Track the invisible labor. Fair division scoring ensures neither partner feels overburdened by daily logistics.",
    gradient: "from-violet-500 to-pink-500",
  },
];

// Illustrative scenarios, not customer reviews. Rendered with an explicit
// "example" label; never present these as verified testimonials.
const exampleScenarios = [
  {
    name: "Exam season",
    role: "Scenario mode: Exam",
    quote:
      "A couple switches on Exam mode so stress and security carry more weight for a few weeks. Recommendations shift toward short, low-effort check-ins instead of long exercises.",
    avatar: "EX",
    score: "Rebalanced weights",
  },
  {
    name: "Trust dip",
    role: "Redline rule",
    quote:
      "Trust drops below a limit one partner set. The engine flags the redline, lowers the overall score and moves trust-building exercises to the top of the list until it recovers.",
    avatar: "TR",
    score: "Redline flagged",
  },
  {
    name: "Hidden imbalance",
    role: "Balance insight",
    quote:
      "Scores look fine on average, but fairness lags far behind the other dimensions. The imbalance penalty surfaces it, and household-task tracking shows where the load is uneven.",
    avatar: "HI",
    score: "Imbalance surfaced",
  },
];

const stats = [
  { value: 9, suffix: "", label: "Score Dimensions" },
  { value: 37, suffix: "", label: "Guided Exercises" },
  { value: 6, suffix: "", label: "Scenario Modes" },
  { value: 2, suffix: " min", label: "Quick Daily Log" },
];

const researchSources = [
  "Gottman Institute",
  "Attachment Theory",
  "Positive Psychology",
  "Cognitive Behavioral Therapy",
  "Emotion-Focused Therapy",
];

// ─── Pricing (single source: TIERS) ─────────────────────────────────
/** Percent saved on the yearly plan versus 12 monthly payments, e.g. 58. */
export function yearlySavingsPercent(tier: { monthlyPrice: number; yearlyPrice: number }): number {
  if (tier.monthlyPrice <= 0) return 0;
  return Math.round((1 - tier.yearlyPrice / (tier.monthlyPrice * 12)) * 100);
}

// ─── Main Landing Page ──────────────────────────────────────────────
export default function LandingClient() {
  const native = useNativePlatform();
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[60%] rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute -right-[20%] top-[20%] h-[60%] w-[50%] rounded-full bg-blue-600/8 blur-[120px]" />
        <div className="absolute -bottom-[20%] left-[30%] h-[50%] w-[40%] rounded-full bg-teal-600/6 blur-[120px]" />
      </div>

      {/* Sticky CTA Bar */}
      <StickyCTABar />

      {/* Navigation */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Couplemetric</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Log in
          </Button>
          <Button size="sm" render={<Link href="/register" />}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-24 text-center sm:pt-28 sm:pb-32">
        <FadeIn>
          <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs">
            <Sparkles className="mr-1 h-3 w-3" />
            Science-backed relationship optimization
          </Badge>
        </FadeIn>
        <FadeIn delay={100}>
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Optimize Your{" "}
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-teal-400 bg-clip-text text-transparent">
              Relationship
            </span>{" "}
            With Science
          </h1>
        </FadeIn>
        <FadeIn delay={200}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Track 9 relationship dimensions, get a science-backed score, and
            improve together with 37 psychology-grounded exercises. Your
            relationship deserves more than guesswork.
          </p>
        </FadeIn>
        <FadeIn delay={300}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="h-12 gap-2 px-8 text-base font-semibold shadow-lg shadow-violet-500/20"
              render={<Link href="/register" />}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 gap-2 px-8 text-base"
              render={<Link href="/quiz" />}
            >
              Take Free Quiz
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Free to start. No credit card required.
          </p>
        </FadeIn>

        {/* Hero visual: animated score preview with before/after */}
        <FadeIn delay={400}>
          <HeroScorePreview />
        </FadeIn>
      </section>

      {/* ─── "Built on Research From" Trust Bar ────────────────── */}
      <section className="relative z-10 border-y border-white/5 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="mb-5 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Built on research from
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {researchSources.map((source) => (
              <span
                key={source}
                className="text-sm font-medium text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <FadeIn>
          <div className="text-center">
            <Badge variant="outline" className="mb-4">
              How It Works
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Three steps to a better relationship
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              No couples therapy appointments. No awkward conversations. Just
              daily micro-actions that compound into real change.
            </p>
          </div>
        </FadeIn>
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <FadeIn key={step.title} delay={i * 150}>
              <div className="relative text-center">
                {i < 2 && (
                  <div className="absolute top-8 left-[60%] hidden h-px w-[80%] bg-gradient-to-r from-violet-500/40 to-transparent sm:block" />
                )}
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 ring-1 ring-white/10">
                  <step.icon className="h-7 w-7 text-violet-400" />
                </div>
                <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Features Grid ────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <FadeIn>
          <div className="text-center">
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to thrive together
            </h2>
          </div>
        </FadeIn>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 100}>
              <Card className="group relative overflow-hidden border-white/5 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:shadow-lg hover:shadow-violet-500/5">
                <CardHeader>
                  <div
                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} opacity-80`}
                  >
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Stats ────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-teal-500/10 p-10 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-teal-400 bg-clip-text text-transparent">
                  <AnimatedCounter
                    target={stat.value}
                    suffix={stat.suffix}
                  />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof / Testimonials ───────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <FadeIn>
          <div className="text-center">
            <Badge variant="outline" className="mb-4">
              Examples
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What it looks like in practice
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Illustrative scenarios showing how the scoring engine responds.
              These are examples, not customer reviews.
            </p>
          </div>
        </FadeIn>
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {exampleScenarios.map((t, i) => (
            <FadeIn key={t.name} delay={i * 150}>
              <Card className="border-white/5 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Example scenario
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t.quote}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    <TrendingUp className="h-3 w-3" />
                    {t.score}
                  </div>
                </CardContent>
                <CardFooter className="border-t border-white/5 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────── */}
      {native === false && (
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24">
        <FadeIn>
          <div className="text-center">
            <Badge variant="outline" className="mb-4">
              Pricing
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start free, upgrade when ready
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Everything you need to get started is completely free. Unlock
              advanced features as your relationship grows.
            </p>
          </div>
        </FadeIn>
        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {/* Free Tier */}
          <FadeIn delay={0}>
            <Card className="border-white/5 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl">{TIERS.free.name}</CardTitle>
                <CardDescription>
                  Everything to get started
                </CardDescription>
                <p className="mt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/forever</span>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {TIERS.free.featureList.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="border-t border-white/5 pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  render={<Link href="/register" />}
                >
                  Get Started Free
                </Button>
              </CardFooter>
            </Card>
          </FadeIn>

          {/* Premium Tier */}
          <FadeIn delay={150}>
            <Card className="relative border-violet-500/30 bg-card/50 backdrop-blur-sm shadow-lg shadow-violet-500/10">
              <div className="absolute -top-3 right-4">
                <Badge className="bg-gradient-to-r from-violet-500 to-blue-500 text-white border-0 px-3 py-1">
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{TIERS.premium.name}</CardTitle>
                <CardDescription>
                  For couples who are serious about growth
                </CardDescription>
                <p className="mt-4">
                  <span className="text-4xl font-bold">
                    ${TIERS.premium.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  or ${TIERS.premium.yearlyPrice}/year
                  <Badge variant="secondary" className="text-xs">
                    Save {yearlySavingsPercent(TIERS.premium)}%
                  </Badge>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {TIERS.premium.featureList.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-violet-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="border-t border-white/5 pt-4 flex-col gap-2">
                <Button
                  className="w-full shadow-lg shadow-violet-500/20"
                  render={<Link href="/pricing" />}
                >
                  Compare Plans
                </Button>
              </CardFooter>
            </Card>
          </FadeIn>
        </div>
      </section>

      )}
      {/* ─── Newsletter CTA ──────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-2xl px-6 py-16">
        <FadeIn>
          <div className="rounded-2xl border border-white/10 bg-card/50 p-8 text-center backdrop-blur-sm">
            <h2 className="text-2xl font-bold tracking-tight">
              Not ready to sign up? Get free weekly tips instead.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Science-backed relationship insights delivered every Tuesday. No account needed.
            </p>
            <div className="mx-auto mt-6 max-w-sm">
              <NewsletterSignup source="landing" />
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24">
        <FadeIn>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 via-blue-500/10 to-teal-500/15 p-12 text-center backdrop-blur-sm">
            <Heart className="mx-auto mb-6 h-12 w-12 text-violet-400" />
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start Your Relationship Journey
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Use a science-backed scoring model to build a stronger, more
              fulfilling relationship. Free to start, no credit card required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-12 gap-2 px-8 text-base font-semibold shadow-lg shadow-violet-500/20"
                render={<Link href="/register" />}
              >
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="h-12 px-8 text-base"
                render={<Link href="/login" />}
              >
                I already have an account
              </Button>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500">
              <Heart className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">Couplemetric</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <Link href="/blog" className="transition-colors hover:text-foreground">
              Blog
            </Link>
            {native === false && (
              <Link href="/pricing" className="transition-colors hover:text-foreground">
                Pricing
              </Link>
            )}
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms of Service
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Couplemetric. Built with psychology,
            philosophy, and mathematics.
          </p>
        </div>
      </footer>
    </div>
  );
}
