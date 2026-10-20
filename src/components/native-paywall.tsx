"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNativePlatform } from "@/lib/capacitor/platform";
import {
  configureRevenueCat,
  loadOffering,
  purchase,
  restore,
  type BillingPackage,
  type BillingPackageId,
  type OfferingResult,
} from "@/lib/revenuecat/client";
import { syncRevenueCatEntitlement } from "@/lib/revenuecat/sync";
import { RestorePurchasesButton } from "@/components/restore-purchases-button";

interface NativePaywallProps {
  userId: string;
  /** Server flag `NATIVE_BILLING_ENABLED`. Nothing renders while false. */
  enabled: boolean;
}

type Offering = { status: "loading" } | OfferingResult;

const PERIOD_LABEL: Record<BillingPackage["period"], { name: string; suffix: string }> = {
  P1Y: { name: "Yearly", suffix: "/yr" },
  P1M: { name: "Monthly", suffix: "/mo" },
};

/**
 * Store-priced Premium paywall for the Android app. Renders only when the
 * server flag is on and the page runs inside the native bridge; prices come
 * from the store offering, never from code.
 */
export function NativePaywall({ userId, enabled }: NativePaywallProps) {
  const router = useRouter();
  const native = useNativePlatform();
  const [offering, setOffering] = useState<Offering>({ status: "loading" });
  const [selected, setSelected] = useState<BillingPackageId>("premium_yearly");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const active = enabled && native === true;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      const configured = await configureRevenueCat(userId);
      const result: OfferingResult = configured ? await loadOffering() : { error: "not-configured" };
      if (!cancelled) setOffering(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, userId]);

  if (!active) return null;

  async function finishPurchase() {
    await syncRevenueCatEntitlement();
    router.refresh();
  }

  async function handlePurchase() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const outcome = await purchase(selected);
      switch (outcome.status) {
        case "success":
          await finishPurchase();
          break;
        case "cancelled":
          break;
        case "pending":
          setMessage("Your payment is pending. Access unlocks once the store confirms it.");
          break;
        case "already-owned": {
          const restored = await restore();
          if ("active" in restored && restored.active) {
            await finishPurchase();
          } else {
            setMessage("This subscription is already owned by another account on this device.");
          }
          break;
        }
        case "error":
          setMessage("The purchase could not be completed. Please try again.");
          break;
      }
    } finally {
      setBusy(false);
    }
  }

  if ("status" in offering) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading plans…
      </div>
    );
  }

  if ("error" in offering) {
    const copy =
      offering.error === "no-offering"
        ? "Plans are not available yet."
        : offering.error === "not-configured"
          ? "Purchases are unavailable in this build."
          : "Plans could not be loaded. Check your connection and try again.";
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{copy}</p>
        <RestorePurchasesButton />
      </div>
    );
  }

  const current = offering.packages.find((p) => p.id === selected) ?? offering.packages[0];
  const buyLabel = current?.trialDays ? "Start free trial" : "Subscribe";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {offering.packages.map((pkg) => {
          const period = PERIOD_LABEL[pkg.period];
          const isSelected = pkg.id === selected;
          return (
            <button
              key={pkg.id}
              type="button"
              aria-pressed={isSelected}
              disabled={busy}
              onClick={() => setSelected(pkg.id)}
              className={`flex w-full items-center justify-between rounded-lg border p-4 text-left ${
                isSelected ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              {period.name}
              <span className="text-sm text-muted-foreground">
                Both of you — {pkg.priceString}{period.suffix}
                {pkg.trialDays ? ` · ${pkg.trialDays}-day free trial` : ""}
              </span>
            </button>
          );
        })}
      </div>
      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Talking to the store…
        </p>
      )}
      {message && <p className="text-sm text-destructive">{message}</p>}
      <Button className="w-full" disabled={busy} onClick={handlePurchase}>
        {buyLabel}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Billed through Google Play. Cancel anytime in your Play subscriptions.
      </p>
      <RestorePurchasesButton />
    </div>
  );
}
