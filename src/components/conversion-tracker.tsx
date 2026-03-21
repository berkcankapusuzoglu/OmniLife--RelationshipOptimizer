"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";

const ROUTE_EVENTS: Record<string, string> = {
  "/": "landing_page_view",
  "/quiz": "quiz_page_view",
  "/register": "register_page_view",
  "/login": "login_page_view",
};

export function ConversionTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Capture UTM params on mount
  useEffect(() => {
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");

    if (utmSource || utmMedium || utmCampaign) {
      const attribution = {
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      };
      try {
        sessionStorage.setItem("utm_params", JSON.stringify(attribution));
      } catch {
        // sessionStorage unavailable
      }
    }
  }, [searchParams]);

  // Fire route-based conversion events
  useEffect(() => {
    const eventName = ROUTE_EVENTS[pathname];
    if (eventName) {
      let utm: Record<string, unknown> = {};
      try {
        const raw = sessionStorage.getItem("utm_params");
        if (raw) utm = JSON.parse(raw);
      } catch {
        // ignore
      }
      trackEvent(eventName, { path: pathname, ...utm });
    }
  }, [pathname]);

  return null;
}
