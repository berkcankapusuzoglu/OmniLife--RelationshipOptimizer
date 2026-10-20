"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { restore } from "@/lib/revenuecat/client";
import { syncRevenueCatEntitlement } from "@/lib/revenuecat/sync";

/**
 * Always-visible restore control for the native paywall and billing settings.
 * Restores store purchases, then asks the server to reconcile entitlement.
 */
export function RestorePurchasesButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRestore() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await restore();
      if ("error" in result) {
        setMessage(
          result.error === "not-configured"
            ? "Purchases are unavailable in this build."
            : "Restore failed. Check your connection and try again."
        );
        return;
      }
      await syncRevenueCatEntitlement();
      if (result.active) {
        setMessage("Your subscription has been restored.");
        router.refresh();
      } else {
        setMessage("No previous purchases were found for this Google account.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className ?? "space-y-2"}>
      <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={handleRestore}>
        Restore purchases
      </Button>
      {message && <p className="text-center text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
