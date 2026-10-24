/**
 * Validation for the untrusted `/api/track` body.
 *
 * This is the only public write path into the events table, so it is both a
 * storage-abuse target and the place where client code could accidentally send
 * personal data. Anything not explicitly allowed is dropped rather than stored.
 */

export const MAX_PROPERTIES = 20;
export const MAX_STRING_LENGTH = 200;
const MAX_NAME_LENGTH = 64;

/** Event names are identifiers we emit ourselves: letters, digits, underscore. */
const NAME_PATTERN = /^[a-z][a-z0-9_]*$/i;

/**
 * Property keys that may carry personal data or credentials. Matched as a
 * substring, case-insensitively, so `partnerEmail` and `sessionToken` are caught
 * as well as `email` and `token`.
 */
const DENIED_KEY_PARTS = [
  "email",
  "password",
  "token",
  "secret",
  "phone",
  "address",
  "name",
  "note",
  "message",
  "content",
];

export interface TrackedEvent {
  name: string;
  properties: Record<string, string | number | boolean>;
}

function isDeniedKey(key: string): boolean {
  const lower = key.toLowerCase();
  return DENIED_KEY_PARTS.some((part) => lower.includes(part));
}

function sanitizeValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  // Objects and arrays are dropped: nested data is where PII and unbounded
  // payloads hide, and no event we emit needs it.
  return undefined;
}

export function parseTrackPayload(body: unknown): TrackedEvent | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const { name, properties } = body as { name?: unknown; properties?: unknown };
  if (typeof name !== "string" || name.length > MAX_NAME_LENGTH || !NAME_PATTERN.test(name)) {
    return null;
  }

  const sanitized: Record<string, string | number | boolean> = {};
  if (properties && typeof properties === "object" && !Array.isArray(properties)) {
    for (const [key, value] of Object.entries(properties)) {
      if (Object.keys(sanitized).length >= MAX_PROPERTIES) break;
      if (isDeniedKey(key)) continue;
      const clean = sanitizeValue(value);
      if (clean !== undefined) sanitized[key] = clean;
    }
  }

  return { name, properties: sanitized };
}
