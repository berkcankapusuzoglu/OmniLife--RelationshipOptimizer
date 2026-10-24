import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAnalyticsSink } from "@/lib/analytics/sink";
import { trackEvent } from "@/lib/analytics/track";

/**
 * `trackEvent` has always been a no-op in the browser: it logs in development and
 * notifies listeners, and nothing ever registered a listener. Every funnel event
 * the app fired was discarded. The sink is the listener that forwards them to
 * /api/track so the funnel is actually measurable.
 */
describe("createAnalyticsSink", () => {
  let posted: Array<{ url: string; body: unknown }>;
  let send: ReturnType<typeof vi.fn<(url: string, body: unknown) => Promise<void>>>;

  beforeEach(() => {
    posted = [];
    send = vi.fn<(url: string, body: unknown) => Promise<void>>(async (url, body) => {
      posted.push({ url, body });
    });
  });

  it("forwards a tracked event to the collector", async () => {
    const stop = createAnalyticsSink({ send, flushMs: 0 });
    trackEvent("quiz_completed", { score: 72 });
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].url).toBe("/api/track");
    expect(posted[0].body).toMatchObject({ name: "quiz_completed", properties: { score: 72 } });
    stop();
  });

  it("stops forwarding once unsubscribed", async () => {
    const stop = createAnalyticsSink({ send, flushMs: 0 });
    stop();
    trackEvent("quiz_completed", {});
    await new Promise((r) => setTimeout(r, 10));
    expect(posted).toHaveLength(0);
  });

  it("never lets a failing collector throw into the caller", async () => {
    send.mockRejectedValue(new Error("network down"));
    const stop = createAnalyticsSink({ send, flushMs: 0 });
    expect(() => trackEvent("quiz_completed", {})).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    stop();
  });

  it("drops events once the in-flight queue is saturated", async () => {
    let release: () => void = () => {};
    send.mockImplementation(
      () => new Promise<void>((resolve) => { release = resolve; })
    );
    const stop = createAnalyticsSink({ send, flushMs: 0, maxQueued: 3 });
    for (let i = 0; i < 50; i++) trackEvent("page_view", { i });
    await new Promise((r) => setTimeout(r, 10));
    expect(send.mock.calls.length).toBeLessThanOrEqual(3);
    release();
    stop();
  });
});
