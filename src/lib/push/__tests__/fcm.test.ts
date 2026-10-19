import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, verify } from "node:crypto";

// Key material is generated per run so no private key literal is ever committed.
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const serviceAccount = Buffer.from(JSON.stringify({ client_email: "fcm@proj-test.iam.gserviceaccount.com", private_key: privatePem })).toString("base64");

const calls = vi.hoisted(() => [] as Array<{ url: string; init: RequestInit }>);
const responses = vi.hoisted(() => ({ token: { status: 200, body: { access_token: "at-1", expires_in: 3600 } as Record<string, unknown> }, send: { status: 200, body: { name: "projects/proj-test/messages/1" } as Record<string, unknown> } }));

async function load() {
  vi.resetModules();
  return import("@/lib/push/fcm");
}

beforeEach(() => {
  calls.length = 0;
  responses.token = { status: 200, body: { access_token: "at-1", expires_in: 3600 } };
  responses.send = { status: 200, body: { name: "projects/proj-test/messages/1" } };
  vi.stubEnv("FIREBASE_PROJECT_ID", "proj-test");
  vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON_B64", serviceAccount);
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const chosen = url.startsWith("https://oauth2.googleapis.com/token") ? responses.token : responses.send;
    return { ok: chosen.status < 300, status: chosen.status, json: async () => chosen.body, text: async () => JSON.stringify(chosen.body) };
  }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("sendPush", () => {
  it("exchanges an RS256 service-account JWT for an access token and posts to FCM v1", async () => {
    const { sendPush } = await load();
    const result = await sendPush("device-token", { title: "Hi", body: "Log today", data: { route: "/daily" } });
    expect(result).toBe("sent");
    expect(calls).toHaveLength(2);

    const [tokenCall, sendCall] = calls;
    expect(tokenCall.url).toBe("https://oauth2.googleapis.com/token");
    const params = new URLSearchParams(String(tokenCall.init.body));
    expect(params.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    const assertion = params.get("assertion")!;
    const [header, payload, signature] = assertion.split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    expect(claims.iss).toBe("fcm@proj-test.iam.gserviceaccount.com");
    expect(claims.aud).toBe("https://oauth2.googleapis.com/token");
    expect(claims.scope).toBe("https://www.googleapis.com/auth/firebase.messaging");
    expect(claims.exp - claims.iat).toBe(3600);
    expect(verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url"))).toBe(true);

    expect(sendCall.url).toBe("https://fcm.googleapis.com/v1/projects/proj-test/messages:send");
    expect((sendCall.init.headers as Record<string, string>).Authorization).toBe("Bearer at-1");
    expect(JSON.parse(String(sendCall.init.body))).toEqual({ message: { token: "device-token", notification: { title: "Hi", body: "Log today" }, data: { route: "/daily" } } });
  });

  it("reuses the cached access token across sends", async () => {
    const { sendPush } = await load();
    await sendPush("a", { title: "t", body: "b" });
    await sendPush("b", { title: "t", body: "b" });
    expect(calls.filter(c => c.url.startsWith("https://oauth2.googleapis.com")).length).toBe(1);
    expect(calls.filter(c => c.url.includes("messages:send")).length).toBe(2);
  });

  it("reports an unregistered token so the caller can delete it", async () => {
    const { sendPush } = await load();
    responses.send = { status: 404, body: { error: { code: 404, status: "NOT_FOUND", details: [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode: "UNREGISTERED" }] } } };
    expect(await sendPush("stale", { title: "t", body: "b" })).toBe("unregistered");
  });

  it("reports other FCM failures as failed and never throws", async () => {
    const { sendPush } = await load();
    responses.send = { status: 500, body: { error: { status: "INTERNAL" } } };
    expect(await sendPush("x", { title: "t", body: "b" })).toBe("failed");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    expect(await sendPush("x", { title: "t", body: "b" })).toBe("failed");
  });

  it("fails fast without calling Google when Firebase is not configured", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON_B64", "");
    const { sendPush } = await load();
    expect(await sendPush("x", { title: "t", body: "b" })).toBe("failed");
    expect(calls).toHaveLength(0);
  });

  it("fails when the token exchange is rejected", async () => {
    const { sendPush } = await load();
    responses.token = { status: 401, body: { error: "invalid_grant" } };
    expect(await sendPush("x", { title: "t", body: "b" })).toBe("failed");
    expect(calls.filter(c => c.url.includes("messages:send"))).toHaveLength(0);
  });
});
