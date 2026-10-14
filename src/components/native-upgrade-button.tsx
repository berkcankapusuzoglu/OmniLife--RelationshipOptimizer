"use client";

import { useState } from "react";
import { isNativePlatform, useNativePlatform } from "@/lib/capacitor/platform";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NativeUpgradeButtonProps {
  tier: "pro" | "premium";
  interval: "monthly" | "yearly";
  /** Retained for callers that pass the authenticated account ID. */
  userId?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Stripe checkout is available only in an ordinary web browser.
 */
export function NativeUpgradeButton({
  tier,
  interval,
  className,
  children,
}: NativeUpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const native = useNativePlatform();

  async function handlePress() {
    if (isNativePlatform()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType: interval, tier }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout unavailable. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("[NativeUpgradeButton] error:", err);
      setError("Purchase failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (native !== false) return null;

  return (
    <div className="space-y-2">
      <Button
        className={className}
        disabled={loading}
        onClick={handlePress}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {children ?? `Go ${tier === "premium" ? "Premium" : "Pro"}`}
      </Button>
      {error && (
        <p className="text-center text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
