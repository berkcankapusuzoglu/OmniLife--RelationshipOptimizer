type AnalyticsEvent = {
  name: string;
  properties: Record<string, unknown>;
  timestamp: string;
  userId?: string;
};

type EventName =
  | "quiz_started"
  | "quiz_completed"
  | "quiz_shared"
  | "signup_started"
  | "signup_completed"
  | "daily_log_submitted"
  | "exercise_completed"
  | "partner_invited"
  | "partner_linked"
  | "upgrade_clicked"
  | "upgrade_completed"
  | "score_shared"
  | "page_view"
  | "milestone_achieved";

const listeners: Array<(event: AnalyticsEvent) => void> = [];

/**
 * Track an analytics event. Logs to console in development.
 * Swap the implementation to PostHog/Mixpanel by replacing the body
 * of this function or adding a listener via `onEvent`.
 */
export function trackEvent(
  name: EventName | string,
  properties: Record<string, unknown> = {},
  userId?: string
) {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: new Date().toISOString(),
    userId,
  };

  if (process.env.NODE_ENV === "development") {
    console.log("[analytics]", event.name, event.properties);
  }

  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Don't let analytics errors break the app
    }
  }
}

/**
 * Register an event listener (for forwarding to PostHog, Mixpanel, etc.)
 * Returns an unsubscribe function.
 */
export function onEvent(
  listener: (event: AnalyticsEvent) => void
): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export type { AnalyticsEvent, EventName };
