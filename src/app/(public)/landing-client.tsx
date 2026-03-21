"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Star,
  ArrowRight,
  ChevronRight,
  Zap,
  Shield,
  Activity,
  X,
  BadgeCheck,
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
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
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

// ─── Live Social Proof Counter (ticks up) ────────────────────────────
function LiveCounter() {
  const [count, setCount] = useState(12847);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => c + Math.floor(Math.random() * 3) + 1);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      Join{" "}
      <span className="inline-flex items-baseline font-semibold text-foreground animate-pulse">
        {count.toLocaleString()}+
      </span>{" "}
      couples optimizing their relationships
    </span>
  );
}

// ─── Activity Ticker ─────────────────────────────────────────────────
const activityMessages = [
  "Sarah & James just completed their 30-day streak \u{1F525}",
  "A couple in London scored 92/100 on their first assessment",
  "Mike & Lisa unlocked the Secure Anchor archetype",
  "A couple in Austin improved by 14 points this week",
  "A couple improved their Trust score by 3 points today",
  "Rachel just invited her partner to OmniLife",
  "2 new couples joined in the last hour",
  "A couple in Tokyo hit a 60-day logging streak \u{1F3AF}",
  "David & Emma moved from Crisis to Thriving in 8 weeks",
  "A couple in Berlin unlocked all 37 exercises",
];

function ActivityTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("ticker-dismissed")) {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    // Show first notification after 3 seconds
    const showTimeout = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(showTimeout);
  }, [dismissed]);

  useEffect(() => {
    if (dismissed || !visible) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % activityMessages.length);
        setVisible(true);
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, [dismissed, visible]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setVisible(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ticker-dismissed", "1");
    }
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 max-w-sm transition-all duration-500 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-card/95 p-4 shadow-xl backdrop-blur-md">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">{activityMessages[currentIndex]}</p>
          <p className="mt-1 text-xs text-muted-foreground">Just now</p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss notifications"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
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
  { label: "Autonomy", before: 53, after: 81, color: "bg-teal-400", colorBefore: "bg-red-400" },
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
              Total Relationship Quality
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
      "Life score (vitality, growth, security, connection) and relationship score (emotional, trust, fairness, stress, autonomy) combine into one total quality metric.",
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
    title: "Insights & Pareto",
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

const testimonials = [
  {
    name: "Sarah & Mark",
    role: "Together 8 years",
    quote:
      "During exam season, OmniLife helped us prioritize what mattered most. We went from constant miscommunication to actually understanding each other's needs. Our score went from 54 to 82 in 6 weeks.",
    avatar: "SM",
    score: "54 \u2192 82",
  },
  {
    name: "Alex & Jordan",
    role: "Together 3 years",
    quote:
      "The scenario mode saved us during a job crisis. Instead of drifting apart, we actually grew closer by adjusting expectations. Our Trust score jumped 18 points in one month.",
    avatar: "AJ",
    score: "61 \u2192 79",
  },
  {
    name: "Priya & Daniel",
    role: "Together 12 years",
    quote:
      "After over a decade together we thought we knew everything. The Pareto insights showed us blind spots we never noticed. Our Connection score went from 58 to 91.",
    avatar: "PD",
    score: "58 \u2192 91",
  },
];

const stats = [
  { value: 9, suffix: "", label: "Score Dimensions" },
  { value: 37, suffix: "", label: "Guided Exercises" },
  { value: 6, suffix: "", label: "Scenario Modes" },
  { value: 89, suffix: "%", label: "Report Improvement" },
];

const researchSources = [
  "Gottman Institute",
  "Attachment Theory",
  "Positive Psychology",
  "Cognitive Behavioral Therapy",
  "Emotion-Focused Therapy",
];

// ─── Main Landing Page ──────────────────────────────────────────────
export default function LandingClient() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[60%] rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute -right-[20%] top-[20%] h-[60%] w-[50%] rounded-full bg-blue-600/8 blur-[120px]" />
        <div className="absolute -bottom-[20%] left-[30%] h-[50%] w-[40%] rounded-full bg-teal-600/6 blur-[120px]" />
      </div>

      {/* Activity Ticker (bottom-left floating) */}
      <ActivityTicker />

      {/* Sticky CTA Bar */}
      <StickyCTABar />

      {/* Navigation */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">OmniLife</span>
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
          {/* Live Social Proof Counter */}
          <div className="mt-6">
            <LiveCounter />
          </div>
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
              Testimonials
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by couples worldwide
            </h2>
          </div>
        </FadeIn>
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 150}>
              <Card className="border-white/5 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    <TrendingUp className="h-3 w-3" />
                    Score: {t.score}
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
            <p className="mt-2 text-sm font-medium text-violet-400">
              14-day free trial on Premium — no credit card required
            </p>
          </div>
        </FadeIn>
        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {/* Free Tier */}
          <FadeIn delay={0}>
            <Card className="border-white/5 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl">Free</CardTitle>
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
                  {[
                    "Daily logging & scoring",
                    "9-dimension breakdown",
                    "10 guided exercises",
                    "Weekly insights",
                    "Basic trend charts",
                  ].map((item) => (
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
                <CardTitle className="text-xl">Premium</CardTitle>
                <CardDescription>
                  For couples who are serious about growth
                </CardDescription>
                <p className="mt-4">
                  <span className="text-4xl font-bold">$7.99</span>
                  <span className="text-muted-foreground">/month</span>
                </p>
                <p className="mt-1 text-xs text-amber-400 font-medium">
                  Launch pricing — lock in $7.99/mo before it increases
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {[
                    "Everything in Free",
                    "All 37 exercises unlocked",
                    "Partner linking & shared view",
                    "6 scenario modes",
                    "Pareto analysis & deep insights",
                    "Household task fairness tracking",
                    "Export & data portability",
                    "Priority support",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-violet-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  Join <span className="font-semibold text-foreground">3,200+</span> premium couples
                </p>
              </CardContent>
              <CardFooter className="border-t border-white/5 pt-4 flex-col gap-2">
                <Button
                  className="w-full shadow-lg shadow-violet-500/20"
                  render={<Link href="/register" />}
                >
                  Start 14-Day Free Trial
                </Button>
                <p className="text-xs text-muted-foreground">
                  No credit card required
                </p>
              </CardFooter>
            </Card>
          </FadeIn>
        </div>
      </section>

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
              Join thousands of couples using science to build stronger, more
              fulfilling relationships. Free to start, no credit card required.
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
            <span className="text-sm font-semibold">OmniLife</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} OmniLife. Built with psychology,
            philosophy, and mathematics.
          </p>
        </div>
      </footer>
    </div>
  );
}
