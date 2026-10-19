#!/usr/bin/env node
/**
 * Post-restore production smoke test for Couplemetric.
 *
 * Usage:
 *   node scripts/smoke.mjs [baseUrl]
 *   node scripts/smoke.mjs                                              # tests production
 *   node scripts/smoke.mjs http://localhost:3000                        # tests local dev
 *
 * Run this after restoring the paused Supabase DB (Supabase dashboard ->
 * project rlanchnpacwxloheszse -> Restore) to verify the deployment is alive.
 *
 * WHAT IS AUTOMATED HERE (plain fetch, no test framework):
 *   - /api/keepalive returns 200 {ok:true} (also proves DB connectivity)
 *   - Public pages render: / , /quiz , /pricing , /login
 *   - POST /api/stripe/checkout without a session returns 401 (route alive)
 *   - GET /api/og?life=75&rel=75&total=75 returns a 200 image
 *
 * WHAT CANNOT BE AUTOMATED FROM THIS SCRIPT (and why):
 *   Registration and login are Next.js *server actions* (src/lib/auth/actions.ts).
 *   Server actions are invoked via POST to the page URL with a build-specific
 *   "Next-Action" header (an opaque hash that changes every deploy), so there is
 *   no stable HTTP endpoint to call. These flows must be verified manually in a
 *   browser -- see the MANUAL CHECKS list printed at the end of the run.
 *
 * Exit code: 0 if all automated checks pass, 1 otherwise.
 */

const DEFAULT_BASE_URL = "https://omnilife-relationship-optimizer.vercel.app";
const baseUrl = (process.argv[2] ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
const hasE2eCredentials = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

const TIMEOUT_MS = 20_000;
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const status = ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${baseUrl}${path}`, {
      redirect: "manual",
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// --- Check a: keepalive endpoint (proves deploy + DB are alive) -------------
async function checkKeepalive() {
  const name = "GET /api/keepalive -> 200 {ok:true}";
  try {
    const res = await request("/api/keepalive");
    if (res.status === 404) {
      record(name, false, "404 — deploy pending (endpoint added recently; redeploy and retry)");
      return;
    }
    if (res.status !== 200) {
      record(name, false, `expected 200, got ${res.status} (503/500 often means Supabase DB still paused)`);
      return;
    }
    let body;
    try {
      body = await res.json();
    } catch {
      record(name, false, "200 but response body is not JSON");
      return;
    }
    if (body && body.ok === true) {
      record(name, true);
    } else {
      record(name, false, `200 but body was ${JSON.stringify(body)} (expected {ok:true})`);
    }
  } catch (err) {
    record(name, false, `request failed: ${err.message}`);
  }
}

// --- Check b: public pages ---------------------------------------------------
async function checkPublicPage(path) {
  const name = `GET ${path} -> 200`;
  try {
    const res = await request(path);
    if (res.status === 200) {
      record(name, true);
    } else {
      record(name, false, `got ${res.status}`);
    }
  } catch (err) {
    record(name, false, `request failed: ${err.message}`);
  }
}

// --- Check c1: Stripe checkout rejects unauthenticated requests --------------
async function checkStripeCheckoutUnauthenticated() {
  const name = "POST /api/stripe/checkout (no session) -> 401";
  try {
    const res = await request("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceType: "monthly", tier: "premium" }),
    });
    if (res.status === 401) {
      record(name, true);
    } else {
      record(name, false, `expected 401, got ${res.status}`);
    }
  } catch (err) {
    record(name, false, `request failed: ${err.message}`);
  }
}

// --- Check c2: OG image API ---------------------------------------------------
// Route: src/app/api/og/route.tsx — params are life, rel, total, date (all optional).
async function checkOgImage() {
  const name = "GET /api/og?life=75&rel=75&total=75 -> 200 image";
  try {
    const res = await request("/api/og?life=75&rel=75&total=75");
    if (res.status !== 200) {
      record(name, false, `expected 200, got ${res.status}`);
      return;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.startsWith("image/")) {
      record(name, true, contentType);
    } else {
      record(name, false, `200 but content-type is "${contentType}" (expected image/*)`);
    }
  } catch (err) {
    record(name, false, `request failed: ${err.message}`);
  }
}

// --- Run ----------------------------------------------------------------------
console.log(`Smoke test against: ${baseUrl}\n`);

await checkKeepalive();
await checkPublicPage("/");
await checkPublicPage("/quiz");
await checkPublicPage("/pricing");
await checkPublicPage("/login");
await checkStripeCheckoutUnauthenticated();
await checkOgImage();

const failed = results.filter((r) => !r.ok);
console.log(`\nSummary: ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.log("Failed checks:");
  for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
}

console.log(`
MANUAL CHECKS (browser required — auth flows are Next.js server actions):
  1. ${hasE2eCredentials ? `Login at ${baseUrl}/login using configured E2E_EMAIL and E2E_PASSWORD -> lands on /overview` : "Authenticated login check skipped; set E2E_EMAIL and E2E_PASSWORD to enable it."}
  2. Complete the quiz at ${baseUrl}/quiz -> result saves and shows an archetype
  3. Submit a daily log at /daily -> a new row appears in the scores table (score shown on /overview)
  4. On /pricing, all 4 checkout combos (pro/premium x monthly/yearly) return live Stripe checkout URLs
  5. On /coaching (premium account), send a message -> Gemini streams a real reply
  6. Request a password reset at /login -> reset email arrives via Resend
`);

process.exit(failed.length > 0 ? 1 : 0);
