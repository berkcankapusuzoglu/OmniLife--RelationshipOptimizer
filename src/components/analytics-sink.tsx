"use client";

import { useEffect } from "react";
import { createAnalyticsSink } from "@/lib/analytics/sink";

/**
 * Installs the listener that forwards `trackEvent` calls to /api/track.
 *
 * Mounted once in the root layout. Without it every client-side funnel event is
 * discarded, which is how the app shipped until now.
 */
export function AnalyticsSink() {
  useEffect(() => createAnalyticsSink(), []);
  return null;
}
