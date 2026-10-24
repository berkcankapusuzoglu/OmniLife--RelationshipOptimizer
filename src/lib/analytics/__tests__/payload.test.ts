import { describe, expect, it } from "vitest";
import { parseTrackPayload, MAX_PROPERTIES, MAX_STRING_LENGTH } from "@/lib/analytics/payload";

/**
 * `/api/track` accepts events from the browser, so the body is untrusted input.
 * It is the only public write path into the events table, which makes it both a
 * storage-abuse target and a place PII could leak in from client code by accident.
 */
describe("parseTrackPayload", () => {
  const valid = { name: "quiz_completed", properties: { step: 5 } };

  it("accepts a well-formed event", () => {
    expect(parseTrackPayload(valid)).toEqual({
      name: "quiz_completed",
      properties: { step: 5 },
    });
  });

  it.each([null, undefined, "quiz_completed", 42, []])(
    "rejects a non-object body: %s",
    (body) => {
      expect(parseTrackPayload(body)).toBeNull();
    }
  );

  it("rejects an event with no name", () => {
    expect(parseTrackPayload({ properties: {} })).toBeNull();
  });

  it("rejects an event name that is not a safe identifier", () => {
    expect(parseTrackPayload({ name: "drop table events" })).toBeNull();
    expect(parseTrackPayload({ name: "../../etc" })).toBeNull();
    expect(parseTrackPayload({ name: "a".repeat(100) })).toBeNull();
  });

  it("defaults missing properties to an empty object", () => {
    expect(parseTrackPayload({ name: "quiz_started" })).toEqual({
      name: "quiz_started",
      properties: {},
    });
  });

  it("drops properties that look like personal data or secrets", () => {
    const parsed = parseTrackPayload({
      name: "signup_completed",
      properties: {
        email: "someone@example.com",
        password: "hunter2",
        sessionToken: "abc",
        partnerEmail: "other@example.com",
        plan: "premium",
      },
    });
    expect(parsed).toEqual({ name: "signup_completed", properties: { plan: "premium" } });
  });

  it("keeps only primitive property values", () => {
    const parsed = parseTrackPayload({
      name: "upgrade_clicked",
      properties: { plan: "yearly", count: 2, isNative: true, nested: { a: 1 }, list: [1, 2] },
    });
    expect(parsed?.properties).toEqual({ plan: "yearly", count: 2, isNative: true });
  });

  it("truncates long strings rather than rejecting the event", () => {
    const parsed = parseTrackPayload({
      name: "page_view",
      properties: { path: "/" + "x".repeat(5000) },
    });
    expect((parsed?.properties.path as string).length).toBe(MAX_STRING_LENGTH);
  });

  it("caps the number of properties", () => {
    const properties = Object.fromEntries(
      Array.from({ length: MAX_PROPERTIES + 20 }, (_, i) => [`k${i}`, i])
    );
    const parsed = parseTrackPayload({ name: "page_view", properties });
    expect(Object.keys(parsed!.properties).length).toBe(MAX_PROPERTIES);
  });

  it("rejects a non-finite number rather than storing NaN", () => {
    const parsed = parseTrackPayload({
      name: "page_view",
      properties: { good: 1, bad: Number.POSITIVE_INFINITY },
    });
    expect(parsed?.properties).toEqual({ good: 1 });
  });
});
