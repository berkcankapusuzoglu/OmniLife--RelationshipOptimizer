"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 text-center">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-purple-600/10">
          <svg
            className="h-8 w-8 text-purple-400"
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

        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Something went wrong
        </h1>

        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          An unexpected error occurred. You can try again or head back to the
          home page.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex h-10 items-center rounded-md bg-purple-600 px-6 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
