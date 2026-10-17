# Backend Closure Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development task-by-task. No subagents from workers. Operational prerequisites are gates, not permission to weaken security.

**Goal:** Prepare and verify safe complimentary ownership and password recovery before migrating/deploying the release candidate.

**Architecture:** Extend the existing nullable provider ownership model with explicit manual grants. Keep password recovery in existing server actions and Resend, with atomic token consumption and sanitized delivery failures. Production operations follow validated recovery and certificate checks.

**Tech Stack:** Next.js 16.4.1, TypeScript, Drizzle, PostgreSQL/postgres.js, Resend, Vitest, Capacitor 8.

**Spec:** `docs/superpowers/specs/2026-10-17-public-launch-design.md`, section 1. The owner approved scope and execution; this document makes the accepted backend tasks concrete without adding a new product decision.

## Global Constraints

- Work only in the existing `codex/play-launch-readiness` worktree; preserve unrelated changes.
- Preserve the four confirmed complimentary tiers and exact expiry values, including null expiry.
- No production billing mutation before validated backup/restore and trusted TLS; no deployment in a code task.
- No secrets, private manifests or real account identifiers in source, test fixtures, reports or logs.
- Read relevant installed Next.js docs before framework changes. Use failing tests before fixes.
- Do not activate purchases, change prices or publish a release.

## Review Focus

- Stale or mixed manifests: no partial entitlement ownership backfill when any manifest entry conflicts (Task 1).
- Existing legacy source constraint: readiness must prove the canonical allowlist includes manual ownership (Task 1).
- Returned provider errors and thrown exceptions: public reset response remains generic; logs never include recipient/token/provider payload (Task 2).
- Concurrent reset redemption: only one password write succeeds for a token; transaction failure leaves it usable (Task 2).
- Production drift: compare grant snapshots immediately before apply, then recheck RLS and live behavior (Task 3).

### Task 1: Explicit manual ownership and operator migration

**Files:** Modify `src/lib/db/schema.ts`, `scripts/subscription-source-migration.mjs`, `scripts/migrate-add-subscription-source.mjs`, `scripts/grant-premium.ts`, `docs/billing-ownership-migration.md`. Tests: `scripts/subscription-source-migration.test.mjs`, `src/lib/subscription/__tests__/billing-schema.test.ts`, `billing-ownership.test.ts`, `checkout-config.test.ts` in that test directory. Change provider/access runtime helpers only if a regression proves it necessary.

**Interfaces:** Preserve `migrateSubscriptionSource(sql, {apply, manifest, now})`. Manifest keeps `stripe` and `verifiedAt`, adds optional `manual` array. Each manual entry requires `userId`, `subscriptionTier` (`pro` or `premium`), `recordedExpiresAt` (ISO timestamp or null), `stripeCustomerId:null`, `stripeSubscriptionId:null`, `ownerConfirmed:true`. Require evidence timestamp within 24 hours for any nonempty manifest. Reject duplicate IDs across both arrays. Keep `--stripe-manifest` compatibility and add clearer `--ownership-manifest` alias; only one manifest argument accepted. Add `proposedManualBackfills`, `appliedManualBackfills`, `alreadyOwnedManualRows` to existing aggregate report.

- [ ] Add tests: manual dry-run writes none; apply changes only source; finite/null expiries preserved; duplicate/stale/unconfirmed evidence rejects; provider IDs reject; conflicting or changed snapshot yields no backfill for any entry; repeat apply changes zero rows; provider webhooks/sync/checkout preserve manual ownership; old two-provider constraint is not ready for manual grants.
- [ ] Run `npm test -- scripts/subscription-source-migration.test.mjs src/lib/subscription/__tests__` and capture expected failures.
- [ ] Implement `manual` allowlist and aggregate accounting. Preflight all entries under the existing table lock; use conditional source-only writes with exact snapshot predicates. Keep existing Stripe proof rules. Do not infer ownership from emails or stored IDs. Ensure canonical constraint readiness rather than trusting its name alone. Replace hard-coded grant script with an immediate safe failure and operator guidance; it must not open a DB connection.
- [ ] Run focused tests, `npm test`, `npm run lint`, `npx tsc --noEmit`, and `git diff --check`. Record actual failures if unrelated; do not suppress them.
- [ ] Commit only Task 1 files as `fix(billing): preserve verified complimentary ownership`, self-review and provide report for independent task review. No production commands.

### Task 2: Reliable password-reset delivery and single use

**Files:** Modify `src/lib/email/index.ts`, `src/lib/auth/reset-actions.ts`; create `src/lib/email/__tests__/password-reset-email.test.ts`, `src/lib/auth/__tests__/reset-actions.test.ts`. Document `RESEND_FROM_EMAIL` in `docs/release/1.0.3-closed-test-checklist.md` without overwriting existing evidence. Read installed `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` first.

**Interfaces:** Preserve `sendPasswordResetEmail(to, resetUrl): Promise<void>` and both public action signatures. Sender requires `RESEND_FROM_EMAIL` and `RESEND_API_KEY`; production must reject the Resend test domain. Delivery helper throws sanitized static errors for configuration/provider failure; request action logs only a static operation failure and returns `{success:true}` for known/unknown email and provider failure. Invalid input retains existing validation response.

- [ ] Add tests for configured sender success, missing configuration, returned provider error, thrown transport error, unsafe production sender, generic known/unknown-user response and no secrets in logs.
- [ ] Add reset tests for invalid/expired/used tokens, mismatched passwords, concurrent redemption, rollback on password-write failure and redirect only after committed success. Inspect actual emitted predicates; do not build mocks that always succeed.
- [ ] Run focused tests and capture RED before implementation.
- [ ] Configure sender, inspect Resend results, sanitize errors and escape reset URL in HTML. Require HTTPS for production reset origin. Consume token conditionally inside the same database transaction as password update, checking unused and unexpired state at write time; hash before opening the transaction. Preserve existing generic invalid-link copy and successful redirect. Do not log tokens, addresses or raw exceptions.
- [ ] Run focused tests, full tests, lint, typecheck, diff check. Commit only this task's changes after self-review, then request independent task review. Preserve prior release checklist edits when staging its combined evidence.

### Task 3: Operational recovery, TLS and rollout evidence

**Files:** `src/lib/db/index.ts` and migration tooling only after trusted connection configuration is established; record evidence in `docs/release/1.0.3-closed-test-checklist.md`. Any needed shared TLS helper gets a separate tested implementation brief rather than ad-hoc production edits.

**Interfaces:** Tasks 1/2 produce code only. Task 3 requires a verified sender/domain, inbox confirmation, trusted DB CA, secure backup destination, isolated restore target and reviewed migration manifest.

- [ ] Inspect available PostgreSQL tools and official provider CA/connection settings without printing secrets. No repeated hanging Docker commands.
- [ ] Obtain backup, restore privately to an isolated target, verify schema/counts/RLS/grant snapshots and document recovery procedure. No new paid resources without approval.
- [ ] Verify database certificate/hostname and transaction behavior; apply the same validated settings to runtime and migration tool with tests.
- [ ] Test email and deletion inbox receipt. Set verification flag only after actual receipt confirmation.
- [ ] With reviewed code and current evidence, dry-run, apply approved manual ownership migration, require ready/zero unresolved, and compare grants and RLS before/after.
- [ ] Run build/audit/secret scan, deploy reviewed commit only when credential/privacy prerequisites are closed, then verify live recovery/deletion/keepalive/authentication. Record exact deployed commit and rollback procedure.
- [ ] Continue to signed-device free closed-test acceptance under the approved launch design. Any unavailable external prerequisite remains explicitly blocked, not passed.

## Preflight and handoff

Task 1 produces schema/migration invariants used by Task 3. Task 2 produces recovery behavior used by Task 3. Tasks 1 and 2 have no shared runtime file; execute sequentially to limit agent context and isolate review. The checklist is shared evidence, so preserve existing content. Task 3 does not authorize production changes while prerequisites are missing. Full monetization and usability implementation plans follow evidence from these tasks, not speculative refactoring.
