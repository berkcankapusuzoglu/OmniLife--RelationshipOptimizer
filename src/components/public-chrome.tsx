"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/back-button";

/**
 * Routes that render their own full-page navigation and footer.
 *
 * This decision is made client-side from usePathname() on purpose: the
 * (public) layout is shared by / and the legal/blog/pricing pages, and a
 * shared layout is not re-rendered on client-side soft navigation. Branching
 * on a request header in the server layout (the earlier D-58 fix) left the
 * landing page with duplicate chrome after /privacy -> / and the legal pages
 * with no chrome after / -> /privacy.
 */
/**
 * "/quiz" is here as of 2026-10-23: the quiz renders a full-height (100dvh)
 * step flow with its own back control and sticky CTA. Wrapping it in the shared
 * header + footer made every step taller than the viewport, so testers had to
 * scroll down to reach "Next".
 */
export const CHROME_HIDDEN_PATHS = new Set(["/", "/quiz"]);

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (CHROME_HIDDEN_PATHS.has(pathname)) {
    return <div className="flex min-h-[100dvh] flex-col">{children}</div>;
  }
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="safe-top border-b border-border/40 px-6 py-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Couplemetric
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/40 px-6 py-6 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
          <span className="ml-auto">&copy; {new Date().getFullYear()} Couplemetric</span>
        </div>
      </footer>
    </div>
  );
}
