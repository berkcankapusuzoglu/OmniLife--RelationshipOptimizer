/**
 * Onboarding gate for the dashboard layout.
 *
 * Pure helper: decides whether a signed-in user may see the requested
 * dashboard route before onboarding is complete. The pathname comes from the
 * `x-pathname` header set in `src/proxy.ts`; when it is missing (proxy not
 * executed, internal render) the gate never redirects, so a redirect loop on
 * `/onboarding` is impossible by construction. The layout still hides all
 * navigation while onboarding is pending, so the only way to reach another
 * route in that degraded case is a typed URL.
 */

/** Routes a user may open while onboarding is still pending. */
export const ONBOARDING_ALLOWED_PREFIXES = ["/onboarding", "/settings"] as const;

export type OnboardingGate = "open" | "allow" | "redirect";

export function isOnboardingAllowedPath(pathname: string): boolean {
  return ONBOARDING_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * - `open`: onboarding complete, render the full dashboard.
 * - `allow`: onboarding pending, render the page in the bare shell (no nav).
 * - `redirect`: onboarding pending and the route is not allowed → `/onboarding`.
 */
export function resolveOnboardingGate(
  onboardingCompleted: boolean,
  pathname: string | null | undefined
): OnboardingGate {
  if (onboardingCompleted) return "open";
  if (pathname == null || pathname === "") return "allow";
  return isOnboardingAllowedPath(pathname) ? "allow" : "redirect";
}

/** Where an authenticated user lands after register/login. */
export function postAuthDestination(onboardingCompleted: boolean): string {
  return onboardingCompleted ? "/overview" : "/onboarding";
}
