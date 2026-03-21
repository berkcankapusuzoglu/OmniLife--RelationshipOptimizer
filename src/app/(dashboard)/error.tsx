"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600/10">
        <svg
          className="h-7 w-7 text-purple-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
        We couldn&apos;t load your dashboard
      </h1>

      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        This might be a temporary issue. Try refreshing the page or head to the
        login page.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-9 items-center rounded-md bg-purple-600 px-5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          Retry
        </button>
        <Link
          href="/login"
          className="inline-flex h-9 items-center rounded-md border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
