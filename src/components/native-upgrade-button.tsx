"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { purchasePackage, type RCPackageId } from "@/lib/revenuecat";
import { syncRevenueCatEntitlement } from "@/lib/revenuecat/sync";

interface NativeUpgradeButtonProps {
  tier: "pro" | "premium";
  interval: "monthly" | "yearly";
  /** User ID — needed to sync entitlement after purchase */
  userId?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Upgrade button that:
 * - On native (iOS/Android): triggers RevenueCat in-app purchase sheet
 * - On web: redirects to /pricing (Stripe checkout)
 */
export function NativeUpgradeButton({
  tier,
  interval,
  userId,
  className,
  children,
}: NativeUpgradeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packageId: RCPackageId = `${tier}_${interval}`;

  async function handlePress() {
    setError(null);
    setLoading(true);

    try {
      if (!Capacitor.isNativePlatform()) {
        // Web: hand off to Stripe pricing page
        router.push("/pricing");
        return;
      }

      const success = await purchasePackage(packageId);
      if (!success) {
        // User cancelled — no error shown
        return;
      }

      // Sync the new entitlement to our DB
      if (userId) {
        await syncRevenueCatEntitlement(userId);
      }

      // Refresh the page to reflect the new tier
      router.refresh();
    } catch (err) {
      console.error("[NativeUpgradeButton] error:", err);
      setError("Purchase failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
