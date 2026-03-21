"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-500">
          <span className="text-3xl font-bold text-white">O</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          You&apos;re offline
        </h1>
        <p className="mb-6 text-muted-foreground">
          OmniLife needs an internet connection to sync your data. Check your
          connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
