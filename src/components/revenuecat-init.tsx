"use client";

import { useEffect } from "react";
import { configureRevenueCat } from "@/lib/revenuecat/client";

interface RevenueCatInitProps {
  userId: string;
  /** Server flag `NATIVE_BILLING_ENABLED`; the SDK is never loaded while false. */
  enabled?: boolean;
}

/**
 * Configures the RevenueCat SDK once per page load for the signed-in user.
 * `configureRevenueCat` is a no-op on the web and without a public key.
 */
export function RevenueCatInit({ userId, enabled = false }: RevenueCatInitProps) {
  useEffect(() => {
    if (!enabled || !userId) return;
    void configureRevenueCat(userId);
  }, [enabled, userId]);
  return null;
}
