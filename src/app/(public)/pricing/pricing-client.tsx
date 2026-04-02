"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TIERS } from "@/lib/subscription/tiers";
import { NativeUpgradeButton } from "@/components/native-upgrade-button";
import { Check, Loader2 } from "lucide-react";

export function PricingClient({
  currentTier,
  userId,
}: {
  currentTier: string;
  userId?: string;
}) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);

  const isPremium = currentTier === "premium";

  async function handleManageSubscription() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Portal error:", data.error);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBilling("monthly")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            billing === "monthly"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            billing === "yearly"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Yearly
          <span className="ml-1.5 text-xs opacity-80">Save 37%</span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Free tier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{TIERS.free.name}</CardTitle>
            <p className="text-3xl font-bold">
              $0<span className="text-base font-normal text-muted-foreground">/mo</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {TIERS.free.featureList.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            {currentTier === "free" && (
              <Button variant="outline" disabled className="w-full">
                Current Plan
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pro tier */}
        <Card className="border-primary/60">
          <CardHeader>
            <CardTitle className="text-xl">{TIERS.pro.name}</CardTitle>
            <p className="text-3xl font-bold">
              ${billing === "monthly" ? TIERS.pro.monthlyPrice : (TIERS.pro.yearlyPrice / 12).toFixed(2)}
              <span className="text-base font-normal text-muted-foreground">/mo</span>
            </p>
            {billing === "yearly" && (
              <p className="text-sm text-muted-foreground">
                Billed ${TIERS.pro.yearlyPrice}/year
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {TIERS.pro.featureList.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            {currentTier === "pro" ? (
              <Button
                className="w-full"
                variant="outline"
                disabled={loading}
                onClick={handleManageSubscription}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Manage Subscription
              </Button>
            ) : currentTier === "premium" ? null : (
              <NativeUpgradeButton
                tier="pro"
                interval={billing}
                userId={userId}
                className="w-full"
              >
                Go Pro
              </NativeUpgradeButton>
            )}
          </CardContent>
        </Card>

        {/* Premium tier */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-xl">{TIERS.premium.name}</CardTitle>
            <p className="text-3xl font-bold">
              ${billing === "monthly" ? TIERS.premium.monthlyPrice : (TIERS.premium.yearlyPrice / 12).toFixed(2)}
              <span className="text-base font-normal text-muted-foreground">/mo</span>
            </p>
            {billing === "yearly" && (
              <p className="text-sm text-muted-foreground">
                Billed ${TIERS.premium.yearlyPrice}/year
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {TIERS.premium.featureList.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            {isPremium ? (
              <Button
                className="w-full"
                variant="outline"
                disabled={loading}
                onClick={handleManageSubscription}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Manage Subscription
              </Button>
            ) : (
              <NativeUpgradeButton
                tier="premium"
                interval={billing}
                userId={userId}
                className="w-full"
              >
                Go Premium
              </NativeUpgradeButton>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
