import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found — OmniLife",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 text-center">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h1 className="bg-gradient-to-r from-purple-400 via-violet-400 to-purple-600 bg-clip-text text-[10rem] font-extrabold leading-none tracking-tighter text-transparent sm:text-[14rem]">
          404
        </h1>

        <h2 className="mt-4 text-2xl font-semibold text-foreground sm:text-3xl">
          Page Not Found
        </h2>

        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md bg-purple-600 px-6 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            Go Home
          </Link>
          <Link
            href="/quiz"
            className="inline-flex h-10 items-center rounded-md border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Take the Quiz
          </Link>
          <Link
            href="/blog"
            className="inline-flex h-10 items-center rounded-md border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Read Our Blog
          </Link>
        </div>
      </div>
    </div>
  );
}
