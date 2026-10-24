"use client";

import { onEvent, type AnalyticsEvent } from "@/lib/analytics/track";

/**
 * Forwards client-side `trackEvent` calls to `/api/track`.
 *
 * Without this listener `trackEvent` is a no-op outside development, which is why
 * the funnel has never been measurable. Analytics must never degrade the app, so
 * every failure here is swallowed and the queue is bounded.
 */
export interface AnalyticsSinkOptions {
  /** Injected for tests; defaults to a keepalive fetch. */
  send?: (url: string, body: unknown) => Promise<void>;
  /** Delay before a queued event is sent. 0 sends on the next tick. */
  flushMs?: number;
  /** Maximum number of requests in flight before events are dropped. */
  maxQueued?: number;
}

const ENDPOINT = "/api/track";

async function defaultSend(url: string, body: unknown): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    // Let the request outlive a page navigation, which is exactly when the most
    // interesting funnel events (clicks through to signup) are fired.
    keepalive: true,
  });
}

export function createAnalyticsSink(options: AnalyticsSinkOptions = {}): () => void {
  const { send = defaultSend, flushMs = 0, maxQueued = 10 } = options;
  let inFlight = 0;
  let stopped = false;

  const unsubscribe = onEvent((event: AnalyticsEvent) => {
    if (stopped || inFlight >= maxQueued) return;
    inFlight++;
    setTimeout(() => {
      void Promise.resolve()
        .then(() => send(ENDPOINT, { name: event.name, properties: event.properties }))
        .catch(() => {
          // Analytics is best-effort: a blocked request or an offline device must
          // never surface to the user.
        })
        .finally(() => {
          inFlight--;
        });
    }, flushMs);
  });

  return () => {
    stopped = true;
    unsubscribe();
  };
}
