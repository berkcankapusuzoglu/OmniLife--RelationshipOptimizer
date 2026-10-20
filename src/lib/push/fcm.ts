/**
 * Firebase Cloud Messaging (HTTP v1) sender with no SDK dependency.
 *
 * Auth: a service-account RS256 JWT (node:crypto) is exchanged at Google's
 * OAuth2 token endpoint for a short-lived access token, which is cached in
 * module state until shortly before it expires.
 *
 * Env:
 *   FIREBASE_PROJECT_ID                 Firebase project id (messages:send path)
 *   FIREBASE_SERVICE_ACCOUNT_JSON_B64   base64 of the service-account JSON key
 */

import { sign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_TTL_SECONDS = 3600;
const TOKEN_REFRESH_MARGIN_MS = 60_000;

export type PushResult = "sent" | "unregistered" | "failed";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function loadConfig(): { projectId: string; account: ServiceAccount } | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64;
  if (!projectId || !encoded) return null;
  try {
    const account = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as Partial<ServiceAccount>;
    if (typeof account.client_email !== "string" || typeof account.private_key !== "string") return null;
    return { projectId, account: { client_email: account.client_email, private_key: account.private_key } };
  } catch {
    return null;
  }
}

function buildAssertion(account: ServiceAccount, nowMs: number): string {
  const iat = Math.floor(nowMs / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + TOKEN_TTL_SECONDS }));
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), account.private_key);
  return `${header}.${payload}.${base64url(signature)}`;
}

async function getAccessToken(account: ServiceAccount): Promise<string | null> {
  const nowMs = Date.now();
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS > nowMs) return cachedToken.value;

  const body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: buildAssertion(account, nowMs) });
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
  if (!res.ok) {
    console.error(`[fcm] Token exchange failed with status ${res.status}.`);
    return null;
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  const ttlSeconds = typeof json.expires_in === "number" ? json.expires_in : TOKEN_TTL_SECONDS;
  cachedToken = { value: json.access_token, expiresAt: nowMs + ttlSeconds * 1000 };
  return cachedToken.value;
}

function isUnregistered(status: number, body: unknown): boolean {
  if (status === 404) return true;
  const details = (body as { error?: { details?: Array<{ errorCode?: string }> } } | null)?.error?.details;
  return Array.isArray(details) && details.some(d => d?.errorCode === "UNREGISTERED");
}

export async function sendPush(token: string, msg: PushMessage): Promise<PushResult> {
  const config = loadConfig();
  if (!config) {
    console.warn("[fcm] Firebase is not configured; push skipped.");
    return "failed";
  }
  try {
    const accessToken = await getAccessToken(config.account);
    if (!accessToken) return "failed";

    const message: Record<string, unknown> = { token, notification: { title: msg.title, body: msg.body } };
    if (msg.data) message.data = msg.data;

    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (res.ok) return "sent";

    let body: unknown = null;
    try { body = await res.json(); } catch { /* non-JSON error body */ }
    if (res.status === 401) cachedToken = null;
    if (isUnregistered(res.status, body)) return "unregistered";
    console.error(`[fcm] Send failed with status ${res.status}.`);
    return "failed";
  } catch (error) {
    console.error("[fcm] Send threw.", error instanceof Error ? error.message : error);
    return "failed";
  }
}
