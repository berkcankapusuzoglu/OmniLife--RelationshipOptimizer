# Minimum Safe Google Play Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the smallest secure, policy-ready, reproducible free Android build that can begin Google Play closed testing.

**Architecture:** Retain the existing Next.js/Drizzle/Capacitor application. Replace unsigned sessions with signed stateless sessions, centralize authenticated ownership checks, add a shared account-deletion service, and make native Android a free-only surface while leaving Stripe web billing unchanged. Harden dependencies and bring the native project under version control before producing a new AAB.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle/PostgreSQL, Vitest, Playwright, Capacitor 8, Android Gradle, Vercel.

**Spec:** `docs/superpowers/specs/2026-10-14-minimum-play-launch-design.md`

**Status note (2026-10-15):** This document preserves the approved implementation sequence; unchecked items are not a current verification ledger. The authoritative operational handoff is `docs/release/1.0.3-closed-test-checklist.md`. Local source integration does not establish deployment, provider configuration, signing or Play acceptance. Keepalive uses only the Vercel daily scheduler with required `CRON_SECRET`; no GitHub backup scheduler is retained.

## Global Constraints

- Preserve every pre-existing working-tree change; never reset, discard, or overwrite unrelated edits.
- Read the relevant installed guides in `node_modules/next/dist/docs/` before changing Next.js APIs or configuration.
- Android v1 is free-only; no native Stripe links, Play Billing, RevenueCat purchases, or new monetization work.
- Keep existing paid entitlements as access-only on Android; remove RevenueCat, Billing, and push dependencies/permissions from the free release.
- Do not print, commit, or copy credentials, signing passwords, environment values, or keystore contents.
- Never track `*.keystore`, `*.jks`, `local.properties`, environment files, or generated build output.
- Do not change scoring, optimization, recommendation, or partner-domain behavior except to enforce authorization.
- A Play submission or production rollout requires a final explicit owner confirmation.

## Review Focus

- A forged, legacy, malformed, altered, or expired session must never authenticate.
- A user-supplied UUID or resource ID must never grant access to another account's data.
- Partner linking/unlinking must remain symmetric without exposing unrelated users.
- Account deletion must remove all owned data without deleting the linked partner's account or data.
- Native Android must expose no external digital-purchase path even when `/pricing` is opened directly.

---

### Task 1: Secret Hygiene and Safe Test Configuration

**Owner:** Security hygiene agent, followed by security reviewer.

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/ANDROID_BUILD_CONFIG.md`
- Modify: `scripts/smoke.mjs`
- Modify: `tests/e2e/feature-check.spec.ts`
- Modify: `tests/e2e/layout.test.ts`
- Modify: `.env.example` if present, otherwise create it with names only
- Create: `scripts/check-secrets.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: environment variables `E2E_EMAIL` and `E2E_PASSWORD` for optional authenticated smoke/E2E coverage.
- Produces: `npm run check:secrets`, which exits nonzero on known credential patterns and tracked signing files.

- [ ] Replace every committed credential/password value with a non-secret placeholder; make authenticated tests skip clearly when their environment variables are absent.
- [ ] Add a secret-check script that scans tracked files only and never reads `.env*` or the keystore.
- [ ] Run `npm run check:secrets` and targeted E2E discovery; expect no credential value in tracked files and no test collection failure.
- [ ] Review `git diff` to prove only secret references/test configuration changed; do not rewrite Git history.

### Task 2: Cryptographically Verified Sessions

**Owner:** Authentication agent, followed by independent security reviewer.

**Files:**
- Modify: `src/lib/auth/session.ts`
- Modify: `src/lib/auth/guard.ts`
- Modify: `src/lib/auth/actions.ts`
- Modify: `src/lib/auth/reset-actions.ts`
- Create: `src/lib/auth/__tests__/session.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `createSession(userId: string): Promise<void>`, `getSession(): Promise<{ userId: string } | null>`, `deleteSession(): Promise<void>`, and `requireAuth()` with their current caller-facing behavior.
- Uses: required server-only `SESSION_SECRET`, a versioned payload, HMAC-SHA-256, URL-safe encoding, and constant-time signature verification.

- [ ] Write tests asserting valid round-trip behavior and rejection of altered payloads/signatures, malformed values, expired values, unsigned legacy cookies, and missing/weak production secrets.
- [ ] Run the focused tests and confirm they fail against the existing Base64-only cookie.
- [ ] Implement the signed cookie without adding a third-party auth dependency; retain `httpOnly`, `secure` in production, `sameSite=lax`, explicit path, and expiry.
- [ ] Run session and existing password/auth tests; expect all to pass.
- [ ] Run `npm run build`; expect success before authorization work begins.

### Task 3: Server-Action Authorization and Ownership

**Owner:** Authorization agent, followed by independent adversarial reviewer.

**Files:**
- Modify: `src/app/(dashboard)/daily/actions.ts`
- Modify: `src/app/(dashboard)/weekly/actions.ts`
- Modify: `src/app/(dashboard)/tasks/actions.ts`
- Modify: `src/app/(dashboard)/exercises/actions.ts`
- Modify: `src/app/(dashboard)/constraints/actions.ts`
- Modify: `src/app/(dashboard)/scenarios/actions.ts`
- Modify: `src/app/(dashboard)/partner/actions.ts`
- Modify: `src/app/(dashboard)/compare/actions.ts`
- Modify: `src/app/(dashboard)/settings/actions.ts`
- Modify: `src/app/(dashboard)/onboarding/actions.ts`
- Modify callers of changed signatures under the corresponding dashboard directories.
- Modify: `src/lib/revenuecat/sync.ts`
- Create: `src/lib/auth/__tests__/authorization.test.ts`

**Interfaces:**
- Consumes: `requireAuth()` from Task 2.
- Produces: actions that infer the actor from the session; resource mutation queries include actor ownership, and partner reads validate `currentUser.partnerId`.

- [ ] Add adversarial tests with users A and B proving A cannot read, update, delete, link, compare, export, or synchronize entitlements as B.
- [ ] Run the tests and confirm the vulnerable actions fail them.
- [ ] Remove authorization dependence on `userId`, `createdById`, `assigneeId`, partner IDs, or form fields supplied by the browser; allow assignment only to self or the authenticated linked partner.
- [ ] Add ownership predicates to update/delete operations and make unauthorized/missing resources return a consistent safe result.
- [ ] Update all client/server callers and validate input enums/ranges already assumed by the UI.
- [ ] Run the authorization tests, full unit suite, and build; expect all to pass.

### Task 4: Complete Account Deletion

**Owner:** Data lifecycle agent, followed by privacy/security reviewer.

**Files:**
- Create: `src/lib/account/delete-account.ts`
- Create: `src/lib/account/__tests__/delete-account.test.ts`
- Modify: `src/app/(dashboard)/settings/actions.ts`
- Modify: `src/app/(dashboard)/settings/settings-client.tsx`
- Create: `src/app/(public)/delete-account/page.tsx`
- Create: `src/app/(public)/delete-account/delete-account-client.tsx`
- Modify: `src/app/(public)/privacy/page.tsx`
- Modify: `src/app/sitemap.ts`

**Interfaces:**
- Produces: `deleteAccount(userId: string): Promise<void>` executed transactionally; authenticated deletion action requiring exact confirmation and current-password verification.
- Consumes: verified session/`requireAuth()` and existing password verification helper.

- [ ] Map every table in `src/lib/db/schema.ts` that contains or references user/couple data and encode a deletion order that preserves the partner's account while severing the relationship.
- [ ] Write tests for complete deletion, rollback on failure, wrong password, deletion of user A without deleting B, and unusable session after success.
- [ ] Implement the shared service and settings danger-zone flow with explicit confirmation.
- [ ] Add the public deletion page with login-based deletion and a support-contact fallback when login is unavailable.
- [ ] Run focused tests, the full suite, and build; expect all to pass.

### Task 5: Free-Only Native Android Surface

**Owner:** Mobile product agent, followed by Play-policy reviewer.

**Files:**
- Create: `src/lib/capacitor/platform.ts`
- Create: `src/lib/capacitor/__tests__/platform.test.ts`
- Modify: `src/components/native-upgrade-button.tsx`
- Modify: `src/components/premium-gate.tsx`
- Modify: `src/components/upgrade-prompt.tsx`
- Modify: `src/app/(public)/pricing/pricing-client.tsx`
- Modify: `src/components/revenuecat-init.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `capacitor.config.ts`
- Modify: `android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Produces: one testable native-platform predicate and native-safe purchase UI behavior.
- Preserves: existing Stripe checkout and subscription management on ordinary web browsers.

- [ ] Add tests mocking Capacitor to prove native mode shows no price, purchase, manage-subscription, external checkout, or RevenueCat initialization control.
- [ ] Implement native free-release messaging and remove purchase navigation while leaving meaningful free features and existing server-granted entitlements usable.
- [ ] Remove RevenueCat and push-notification packages/startup configuration plus Android Billing/notification permissions from this release.
- [ ] Verify direct navigation to `/pricing` in native mode remains policy-safe.
- [ ] Run focused component/unit tests, full unit tests, and build.

### Task 6: Privacy and Google Play Declaration Pack

**Owner:** Compliance documentation agent; may run in parallel with Task 5 if it does not edit the same files. Final answers require owner review.

**Files:**
- Modify: `src/app/(public)/privacy/page.tsx`
- Modify: `src/app/(public)/terms/page.tsx` only where implementation facts changed
- Modify: `docs/google-play-publishing.md`
- Create: `docs/google-play-data-safety.md`

**Interfaces:**
- Consumes: the released behavior from Tasks 2–5.
- Produces: a field-by-field console checklist with facts, owner decisions, URLs, and evidence paths.

- [ ] Correct the session description and disclose actual processors/data flows, retention, deletion, AI coaching, web-only Stripe, dormant native billing, and analytics behavior.
- [ ] State immediate deletion from the active database and the actual configured provider-backup retention; require verification that the displayed privacy/support contact is monitored.
- [ ] Map the released build to Data Safety, Health Apps, content rating, ads, target audience, app access, privacy URL, and account-deletion URL.
- [ ] Mark legal/business assertions requiring owner confirmation rather than guessing.
- [ ] Verify every referenced route returns a successful production-like response after build.

### Task 7: Dependency and Quality Gate Hardening

**Owner:** Framework/dependency agent, followed by build reviewer.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify only framework-dependent source/config files required by documented upgrades.
- Modify lint-failing source files only for actual errors; warnings may be logged for later.

**Interfaces:**
- Produces: a clean install/build with supported Next.js/Capacitor/Drizzle versions and no known critical/high production vulnerability left without an explicit documented exception.

- [ ] Read the relevant guides under `node_modules/next/dist/docs/` and record any required migration constraints in the task summary.
- [ ] Upgrade Next.js and matching ESLint config to a fixed compatible release, then upgrade affected Capacitor, Drizzle, Resend, UUID, and transitive packages conservatively.
- [ ] Move CLI-only packages out of production dependencies where verified safe.
- [ ] Run `npm ci`, `npm test`, `npm run lint`, `npm run build`, and `npm audit --omit=dev --audit-level=high`.
- [ ] Fix release-blocking regressions and lint errors without unrelated refactors; document any remaining advisory with exploitability and mitigation.

### Task 8: Reproducible Android Project and Release Candidate

**Owner:** Android release agent, followed by release reviewer.

**Files:**
- Modify: `.gitignore`
- Add: required Android source/configuration under `android/`
- Modify: `android/app/build.gradle`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `android/app/src/main/java/com/omnilife/app/MainActivity.java`
- Modify: `docs/ANDROID_BUILD_CONFIG.md`

**Interfaces:**
- Consumes: verified web deployment URL and dependency versions from Task 7.
- Produces: version code `6` or higher, target API 36, a reproducible release build, and checksums/build metadata for the AAB without tracking the artifact or key.

- [ ] Replace the blanket `android/` ignore with narrow rules for secrets, keys, local properties, Gradle caches, generated assets, and build outputs; use `git check-ignore` to verify exclusions.
- [ ] Track the native project source, disable unnecessary third-party cookies and sensitive backup behavior unless a documented functional test proves they are required.
- [ ] Run Capacitor sync and a clean Android build; confirm no credential or signing file is staged.
- [ ] Increment version code, build the signed release AAB using environment-provided passwords, and record SHA-256 plus target/version metadata without logging secrets.
- [ ] Install/test on at least one Android emulator/device for login, onboarding, daily entry, partner-free use, deletion, offline/error behavior, and absence of purchase paths.

### Task 9: Whole-Release Verification and Closed-Test Handoff

**Owner:** Independent release captain; no implementation unless a failed gate is assigned back to the owning agent.

**Files:**
- Modify: `docs/google-play-publishing.md` with verified results only.
- Create: `docs/release/1.0.3-closed-test-checklist.md`

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: a go/no-go report and exact owner-only console actions.

- [ ] Review the complete diff for cross-task conflicts, accidental secret exposure, authentication bypasses, external-purchase paths, and unrelated changes.
- [ ] Run secret scan, unit tests, lint, build, production audit, smoke tests, Android clean build, and authorization/deletion/native-policy tests from a clean checkout.
- [ ] Deploy to staging/production only after migrations and environment requirements are confirmed; verify `/`, login/register, privacy, terms, deletion, authenticated core flow, and keepalive.
- [ ] Upload the new AAB to the closed track only after the go decision; inspect the generated pre-launch report and return failures to the responsible agent.
- [ ] Leave owner actions: rotate external credentials, verify declarations and account eligibility, select/add at least 12 testers and maintain 14 continuous opted-in days where required, submit closed testing, apply for production access, and explicitly approve staged rollout.

## Execution Waves

1. Task 1, then Task 2 and its security review.
2. Task 3 and its adversarial review; this establishes the identity boundary for all later work.
3. In parallel where files do not overlap: Task 4, Task 5, and the non-privacy-page portion of Task 6.
4. Task 6 final reconciliation, then Task 7.
5. Task 8, then independent Task 9 whole-release verification.

Agents must not edit overlapping files concurrently. Each implementation agent returns changed files, commands/results, unresolved risks, and a diff summary. Each reviewer either approves or sends a focused correction list back to the same owner before the next dependent wave begins.
