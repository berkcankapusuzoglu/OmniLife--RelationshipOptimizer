"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  TIERS,
  FEATURE_LABELS,
  type Features,
} from "@/lib/subscription/tiers";

interface PricingClientProps {
  currentTier: string | null;
  isLoggedIn: boolean;
}

const FEATURE_ORDER: (keyof Features)[] = [
  "dailyLog",
  "basicScores",
  "weeklyCheckin",
  "partnerLinking",
  "exerciseLimit",
  "historyDays",
  "insights",
  "scenarios",
  "constraints",
  "exportReports",
];

function formatFeatureValue(
  feature: keyof Features,
  value: boolean | number
): string | null {
  if (typeof value === "boolean") return null;
  if (value === Infinity) return "Unlimited";
  if (feature === "exerciseLimit") return `${value} exercises`;
  if (feature === "historyDays") return `${value} days`;
  return `${value}`;
}

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your settings page and you'll keep Premium until the end of your billing period.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "All your data is kept. You'll just lose access to premium features like insights and scenario modes.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes! Start a 7-day free trial of Premium with no credit card required.",
  },
  {
    q: "Can my partner and I share a subscription?",
    a: "Each account needs its own subscription, but partner linking is free for everyone.",
  },
];

export function PricingClient({ currentTier, isLoggedIn }: PricingClientProps) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const price =
    billing === "monthly"
      ? TIERS.premium.price.monthly
      : TIERS.premium.price.yearly;
  const perMonth =
    billing === "yearly"
      ? (TIERS.premium.price.yearly / 12).toFixed(2)
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      {/* Header */}
      <div className="mb-4 text-center">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          OmniLife
        </Link>
      </div>
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Invest in your relationship
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Start free. Upgrade when you need deeper insights.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <button
          onClick={() => setBilling("monthly")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            billing === "monthly"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            billing === "yearly"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Yearly
          <Badge variant="secondary" className="ml-2 text-xs">
            Save 38%
          </Badge>
        </button>
      </div>

      {/* Plans */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Free Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Free</CardTitle>
            <div className="mt-2">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground">/forever</span>
            </div>
            {currentTier === "free" && (
              <Badge variant="secondary" className="mt-2 w-fit">
                Current Plan
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoggedIn ? (
              currentTier === "free" ? (
                <Button variant="outline" className="w-full" disabled>
                  Your Current Plan
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Downgrade
                </Button>
              )
            ) : (
              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/register" />}
              >
                Get Started Free
              </Button>
            )}
            <ul className="space-y-3">
              {FEATURE_ORDER.map((feature) => {
                const value = TIERS.free.features[feature];
                const enabled =
                  typeof value === "boolean" ? value : value > 0;
                const label = formatFeatureValue(feature, value);
                return (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    {enabled ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span
                      className={enabled ? "" : "text-muted-foreground/60"}
                    >
                      {FEATURE_LABELS[feature]}
                      {label && (
                        <span className="ml-1 text-muted-foreground">
                          ({label})
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="relative border-purple-500/30 shadow-lg shadow-purple-500/5">
          <div className="absolute -top-3 right-4">
            <Badge className="bg-gradient-to-r from-purple-600 to-violet-600 text-white">
              Recommended
            </Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-xl">Premium</CardTitle>
            <div className="mt-2">
              <span className="text-3xl font-bold">
                ${billing === "monthly" ? price : perMonth}
              </span>
              <span className="text-muted-foreground">/month</span>
              {billing === "yearly" && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Billed ${price}/year
                </p>
              )}
            </div>
            {currentTier === "premium" && (
              <Badge
                variant="secondary"
                className="mt-2 w-fit border-purple-500/30"
              >
                Current Plan
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoggedIn ? (
              currentTier === "premium" ? (
                <Button className="w-full" disabled>
                  Your Current Plan
                </Button>
              ) : (
                <Button className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-500 hover:to-violet-500">
                  Start 7-Day Free Trial
                </Button>
              )
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-500 hover:to-violet-500"
                render={<Link href="/register" />}
              >
                Start 7-Day Free Trial
              </Button>
            )}
            <ul className="space-y-3">
              {FEATURE_ORDER.map((feature) => {
                const value = TIERS.premium.features[feature];
                const label = formatFeatureValue(feature, value);
                return (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                    <span>
                      {FEATURE_LABELS[feature]}
                      {label && (
                        <span className="ml-1 text-muted-foreground">
                          ({label})
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div className="mt-20">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
          Frequently Asked Questions
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {FAQ.map((item) => (
            <div key={item.q} className="space-y-2">
              <h3 className="font-medium">{item.q}</h3>
              <p className="text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
