"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TIERS } from "@/lib/subscription/tiers";
import { NativeUpgradeButton } from "@/components/native-upgrade-button";
import { NativePaywall } from "@/components/native-paywall";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { RestorePurchasesButton } from "@/components/restore-purchases-button";
import { Check, Loader2 } from "lucide-react";
import { isNativePlatform, useNativePlatform } from "@/lib/capacitor/platform";

/** Serializable subset of `Entitlement` for the client. */
export interface PricingEntitlement {
  tier: string;
  via: "own" | "partner" | "trial" | "none";
  source: "stripe" | "revenuecat" | "manual" | null;
  ownerId: string;
  expiresAt: string | null;
}

export function PricingClient({
  currentTier,
  userId,
  nativeBilling = false,
  entitlement = null,
}: {
  currentTier: string;
  userId?: string;
  /** Server flag `NATIVE_BILLING_ENABLED`. */
  nativeBilling?: boolean;
  entitlement?: PricingEntitlement | null;
}) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const native = useNativePlatform();

  const isPremium = currentTier === "premium";
  const isLegacyPro = currentTier === "pro";

  async function handleManageSubscription() {
    if (isNativePlatform()) return;
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

  if (native !== false) {
    // Purchase UI needs the server flag AND a confirmed native bridge.
    if (native === true && nativeBilling) {
      return (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Premium</h1>
          <p className="text-sm text-muted-foreground">
            One subscription covers both linked partners.
          </p>
          {entitlement?.via === "partner" ? (
            <p>Premium is included with your partner&apos;s plan.</p>
          ) : entitlement?.via === "own" ? (
            <div className="space-y-3">
              <p>
                Current plan: <span className="capitalize">{currentTier}</span>
              </p>
              <ManageSubscriptionButton source={entitlement.source} productId={null} />
              <RestorePurchasesButton />
            </div>
          ) : userId ? (
            <NativePaywall userId={userId} enabled={nativeBilling} />
          ) : (
            <p>Sign in to subscribe.</p>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Your account</h1>
        <p>Daily logging, scores, and guided exercises are available in the app.</p>
        <p>Account access: <span className="capitalize">{currentTier}</span></p>
        <p className="text-sm text-muted-foreground">Your existing account features remain available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="mt-3 text-lg text-muted-foreground">Start free. Upgrade when you&apos;re ready.</p>
      </div>
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
          <span className="ml-1.5 text-xs opacity-80">Save 58%</span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
            <p className="text-sm text-muted-foreground">7-day free trial, covers both partners</p>
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
            {isPremium && entitlement?.via === "partner" ? (
              <p className="text-center text-sm text-muted-foreground">
                Included with your partner&apos;s Premium
              </p>
            ) : isPremium ? (
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

      {/* Legacy Pro: readable for existing subscribers, no longer sold */}
      {isLegacyPro && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Legacy Pro</p>
              <p className="text-sm text-muted-foreground">
                Your Pro plan continues at its current price. Switching to Premium adds AI coaching and partner coverage.
              </p>
            </div>
            <Button
              variant="outline"
              disabled={loading}
              onClick={handleManageSubscription}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
