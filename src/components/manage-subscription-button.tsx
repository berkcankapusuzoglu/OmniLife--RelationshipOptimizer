"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { managementUrl } from "@/lib/revenuecat/client";

export const ANDROID_PACKAGE = "app.couplemetric.android";

export function playSubscriptionsUrl(productId: string | null): string {
  const url = new URL("https://play.google.com/store/account/subscriptions");
  if (productId) url.searchParams.set("sku", productId);
  url.searchParams.set("package", ANDROID_PACKAGE);
  return url.toString();
}

interface ManageSubscriptionButtonProps {
  /** `users.subscriptionSource` of the subscription owner. */
  source: "stripe" | "revenuecat" | "manual" | null;
  /** Store product id for Play deep links (`users.billingProductId`). */
  productId: string | null;
  className?: string;
}

async function openExternal(url: string) {
  if (isNativePlatform()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
  } else {
    window.location.href = url;
  }
}

/**
 * Source-aware subscription management: store purchases go to Google Play,
 * Stripe purchases to the billing portal, complimentary access has no control.
 */
export function ManageSubscriptionButton({ source, productId, className }: ManageSubscriptionButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (source === "manual") {
    return <p className="text-sm text-muted-foreground">Complimentary access</p>;
  }
  if (source !== "revenuecat" && source !== "stripe") return null;

  async function handleManage() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (source === "revenuecat") {
        const url = (await managementUrl()) ?? playSubscriptionsUrl(productId);
        await openExternal(url);
        return;
      }
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError("Billing portal is not available. Please contact support.");
        return;
      }
      await openExternal(data.url);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button type="button" variant="outline" disabled={busy} onClick={handleManage}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
        Manage Subscription
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
