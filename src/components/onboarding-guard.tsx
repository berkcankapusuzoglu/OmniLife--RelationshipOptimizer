"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isOnboardingAllowedPath } from "@/lib/auth/onboarding-gate";

/**
 * Client half of the onboarding gate (D-03/D-37).
 *
 * The dashboard layout runs its server gate only on full page loads: layouts
 * do not re-render on client-side navigation, so the `x-pathname` it read is
 * stale after the first `<Link>`/`router.push`. This component is mounted in
 * the bare (onboarding-pending) shell and re-checks the live pathname on every
 * navigation, replacing disallowed routes with `/onboarding`. It also covers
 * a typed URL when `x-pathname` was missing server-side. The "Continue setup"
 * link follows the live pathname for the same reason.
 */
export function OnboardingGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = pathname != null && isOnboardingAllowedPath(pathname);

  useEffect(() => {
    if (!allowed) router.replace("/onboarding");
  }, [allowed, router]);

  const onOnboarding = pathname === "/onboarding" || pathname?.startsWith("/onboarding/");
  if (!allowed || onOnboarding) return null;

  return (
    <Link
      href="/onboarding"
      className="ml-auto text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      Continue setup
    </Link>
  );
}
