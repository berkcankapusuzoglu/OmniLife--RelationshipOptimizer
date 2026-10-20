"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isNativePlatform, useNativePlatform } from "@/lib/capacitor/platform";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NativeUpgradeButtonProps {
  tier: "pro" | "premium";
  interval: "monthly" | "yearly";
  /** Retained for callers that pass the authenticated account ID. */
  userId?: string;
  className?: string;
  /** Focus the button on mount (used when a CTA deep-links to a preselected plan). */
  autoFocus?: boolean;
  children?: React.ReactNode;
}

/**
 * Stripe checkout is available only in an ordinary web browser.
 */
export function NativeUpgradeButton({
  tier,
  interval,
  className,
  autoFocus = false,
  children,
}: NativeUpgradeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const native = useNativePlatform();
  // Synchronous guard: React state updates are batched, so a double tap could
  // otherwise create two Checkout sessions before `loading` disables the button.
  const inFlight = useRef(false);

  async function handlePress() {
    if (isNativePlatform()) return;
    if (inFlight.current) return;
    inFlight.current = true;
    let navigating = false;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType: interval, tier }),
      });
      if (res.status === 401) {
        navigating = true;
        router.push("/register");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout unavailable. Please try again.");
        return;
      }
      // Keep the guard engaged: the page is navigating to Checkout.
      navigating = true;
      window.location.href = data.url;
    } catch (err) {
      console.error("[NativeUpgradeButton] error:", err);
      setError("Purchase failed. Please try again.");
    } finally {
      if (!navigating) {
        inFlight.current = false;
        setLoading(false);
      }
    }
  }

  if (native !== false) return null;

  return (
    <div className="space-y-2">
      <Button
        className={className}
        disabled={loading}
        aria-busy={loading}
        autoFocus={autoFocus}
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
