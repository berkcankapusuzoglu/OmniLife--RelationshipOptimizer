export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Score cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-5"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-lg border bg-card p-5">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-48 animate-pulse rounded bg-muted" />
      </div>

      {/* Bottom cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-5"
          >
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-3 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
