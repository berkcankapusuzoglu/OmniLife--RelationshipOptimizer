"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      trackEvent("page_view", { path: pathname });
      prevPathname.current = pathname;
    }
  }, [pathname]);

  // Track initial page view
  useEffect(() => {
    trackEvent("page_view", { path: pathname, initial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
