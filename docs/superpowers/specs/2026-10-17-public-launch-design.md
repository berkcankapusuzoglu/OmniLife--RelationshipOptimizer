# Public launch: proposed design and staged roadmap

Status: scope approved by the owner on 2026-10-17 ("yes, do all of that"). This is not launch approval or evidence that the work is complete. Prices, paid-product activation and public rollout retain their explicit approval gates. No production changes were made while preparing this document.

## Outcome and scope

Make OmniLife safe and useful in a free closed test, then add a single paid Premium offering before a monetized public launch. Keep the existing Next.js, Capacitor, Supabase and Vercel architecture. Do not restart the earlier security audit or redesign the entire app.

The owner approved the staged direction and explicitly chose **buyer-only Premium**. Linking a partner stays free; linking, unlinking or changing partners never transfers a subscription. The four confirmed complimentary accounts retain their current tier and expiry.

This draft proposes changing the October 14 design's "first public release is free; billing is post-launch" sequence to "free closed test, then verified monetization before public launch." The original free-only Android boundary remains in force until the paid implementation and a new signed build pass acceptance. Approving this document accepts the revised sequence, not prices or a store submission.

Out of scope: iOS launch, ads, couples subscriptions, new analytics SDKs, push notifications, new coaching features, algorithm rewrites, a rebrand, and paid infrastructure purchases without approval.

## Evidence and review limitations

Use [the release checklist](../../release/1.0.3-closed-test-checklist.md) for detailed evidence. It records 380 passing tests, the signed version-code 6 bundle accepted into an unsubmitted Alpha draft, and successful RLS isolation for three sensitive tables. It also records no validated backup, unresolved database certificate validation, missing deployment, unverified email delivery and no signed-device acceptance. Passing mocked tests does not prove live billing or usability.

Three focused agents were dispatched. The backend agent completed its source review. Monetization and UX agents stopped at the account usage limit without producing reviews. The coordinator inspected the relevant subscription, onboarding and coaching code and checked provider documentation. Independent review of this new design remains pending; do not describe it as three-agent-approved.

## 1. Reliable backend before real-user testing

### Explicit complimentary ownership

Extend the existing ownership model with `manual`, without inventing Stripe or RevenueCat identifiers. A private, reviewed manifest identifies the four accounts by ID and exact tier, expiry and provider-ID snapshots. Applying it changes only ownership, and refuses stale snapshots, conflicting providers, duplicate IDs or previously owned rows. Repeat application is idempotent. Existing expiry semantics remain unchanged.

Files: `src/lib/db/schema.ts`, `scripts/subscription-source-migration.mjs`, `scripts/migrate-add-subscription-source.mjs`, `scripts/grant-premium.ts`, `docs/billing-ownership-migration.md`, and existing migration/billing ownership tests. Retire or make the hard-coded grant script fail closed so future grants cannot bypass ownership recording. Provider events and checkout must not overwrite manual grants. Moving a manual account to paid billing is a separate explicit operation, not an automatic checkout side effect.

### Recovery and transport

Before any production billing migration, obtain a private database dump and restore it into an isolated non-production target. Verify schema, constraints, RLS, table counts and entitlement snapshots; record checksum, timestamp and recovery steps without recording secrets or account emails. Use a supported native PostgreSQL client or provider export; Docker is not a requirement. Restore-target provisioning and any cost require approval.

Resolve the certificate chain using trusted provider configuration. Verify hostname/certificate validation, transaction rollback and concurrent pooler connections. Do not use `rejectUnauthorized:false` as the fix. Apply compatible connection configuration to both `src/lib/db/index.ts` and migration tooling.

### Email and public contact

Make the sender configurable in `src/lib/email/index.ts`. Handle missing configuration and returned Resend errors with sanitized operational reporting while keeping password-reset responses non-enumerating. Verify reset links arrive, point to the correct HTTPS origin, work once, and reject expired/reused tokens. Add focused tests alongside `src/lib/auth/reset-actions.ts` coverage.

Public support/deletion contact is `info.llcluna@gmail.com`. Verify actual inbox receipt before enabling the verification flag. This incoming Gmail address does not establish a verified outgoing Resend domain. Domain/DNS access remains an owner prerequisite.

### Deployment gate

Run migration dry-run, review exact affected rows, apply only after recovery/TLS checks, then require `ready:true`, zero unresolved/invalid rows and unchanged complimentary tiers/expiries. Recheck sensitive-table RLS. Finish relevant credential rotation and provider/privacy facts. Deploy the reviewed commit, record deployment identity, and verify recovery, deletion, authentication, authorized keepalive and existing access against the live origin. Prepare rollback to a compatible known-good application, not an unreviewed database downgrade.

## 2. Useful free closed test

Test the real signed app against the deployed candidate, first through direct device installation if necessary, then through the approved closed track. Retain the current free-only purchase restrictions. No purchase SDK or paywall is added to version code 6.

The core journey is registration, optional partner setup, first daily log, understandable result, one useful exercise, and return the next day. Test recovery, partner consent, session persistence, deletion, offline retry and back/relaunch separately.

Proposed usability acceptance: at least three consenting testers unfamiliar with the app can independently register and save a first log within five minutes, find the next exercise, and explain which data their partner can see. Observe confusion without collecting their real relationship details. Fix every blocking failure, retest the failed journey, and record observations. This small test is not proof of universal ease of use and does not replace Google's testing requirements.

Existing onboarding has Goals, Self-Assessment, Scenario, Constraints and Partner steps. First observe where people stall; if necessary, defer optional scenario/constraint customization to existing settings. Preserve saved data and invitation context. No broad redesign or mandatory partner requirement.

## 3. One truthful Free/Premium product

New customers should see Free and Premium only, with monthly and annual Premium options. Keep legacy `pro` readable internally and preserve existing grants; do not silently downgrade anyone. Remove new Pro sales only as part of a coordinated web/native product change, not while lifecycle handling is incomplete.

Before advertising limits, make a single tested feature matrix. Current `tiers.ts` says three free exercises per week, while `couple-bonus.ts` contains five/eight exercise limits and seven/fourteen history days. Partner-comparison access has its own seven/thirty-day authorization boundary. These are not automatically interchangeable. Trace actual callers, distinguish personal history from partner comparison, and reconcile enforcement and copy before changing benefits. Do not expand partner-data access to match marketing text.

Proposed paid value uses working existing features: longer personal history, insights, exercise access and exports. Include a feature only after its server authorization and actual output pass acceptance. Do not promise priority support, therapist outcomes or unlimited AI by default.

AI coaching is a separate activation gate, not the reason to delay safe free testing. Its current action hard-codes `gemini-2.0-flash`, has no per-user usage budget, and silently substitutes a static response after provider failure. Before selling AI access, verify a supported model in the actual project, sensitive-data terms/consent, measured cost, atomic per-user quotas, bounded input/context/output, concurrency handling and truthful unavailable/fallback messaging. If these are unresolved, exclude AI from the offer and gate provider calls; disclose any effect on existing complimentary users. No unlimited-use promise.

Owner approval of exact prices, feature limits and any AI allowance is required before product activation. Existing code prices are evidence of old configuration, not approved launch prices. Profitability checks include store/provider fees, refunds, tax treatment, hosting and measured AI cost; no earnings guarantee.

## 4. Android subscriptions after free-flow acceptance

Coordinator recommendation: reuse the existing RevenueCat server integration and add its Capacitor wrapper over Google Play Billing, rather than maintain a second direct-Billing backend. [RevenueCat documents its Capacitor integration](https://www.revenuecat.com/docs/getting-started/installation/capacitor). Confirm current SDK compatibility and service cost before installation. Existing client exports are no-op stubs, not a working purchase implementation.

Files to scope in the paid implementation plan: `src/lib/revenuecat/index.ts`, `src/lib/revenuecat/sync.ts`, `src/app/api/revenuecat/webhook/route.ts`, `src/components/revenuecat-init.tsx`, subscription access/ownership helpers, pricing/settings components, package lockfile and Android configuration.

Use authenticated immutable app-user IDs, a single Premium entitlement, and monthly/annual Play products. Prices displayed in Android come from the store. Use server-verified state as authority; client purchase success is not permission to grant access. Reconcile current provider state rather than trusting event arrival order or increasing expiry alone. Keep secrets server-side and prevent Stripe, RevenueCat and manual ownership from overwriting one another.

Required tests: purchase success, cancellation, pending payment, renewal, grace period, account hold, expiry, refund/revocation before expiry, duplicate/delayed/reordered events, restore/reinstall, logout/account switching, deleted accounts, wrong-user receipts and provider outage. Prove no purchase transfers to a linked partner or different login. Restore is an explicit user action, consistent with [RevenueCat's restore guidance](https://www.revenuecat.com/docs/getting-started/restoring-purchases).

Define account-deletion versus store-subscription cancellation behavior explicitly and disclose it before purchase/deletion. Do not assume deleting an app user cancels Google Play billing. Test the actual cancellation/refund workflow and support path. Use store test purchases, not unauthorized charges to testers.

Rebuild with a version code above 6 and verify signing, manifest, dependency changes and store-device lifecycle. Because older native builds load the same hosted web app, gate purchase UI on both approved server configuration and verified native capability; a user-agent flag alone is insufficient. Old free-only clients must keep working without broken SDK calls or external checkout links. Rollback disables new sales without revoking valid entitlements or stopping reconciliation.

## 5. Release and business gates

Review all 13 queued Console changes, including existing declarations. Establish actual developer/account eligibility, app access, age/content/health/ads declarations, legal operator, privacy/retention/AI facts, support and deletion URLs, merchant/payout verification and target markets. Never fill unknown declarations with guesses.

Submit a closed test only after explicit approval of the exact release. The existing two-person list is not evidence of production eligibility. Where applicable, complete Google's [12-testers/14-continuous-days requirement](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), collect genuine feedback, resolve pre-launch findings and obtain production access. Recheck current policy at execution time.

Public rollout needs explicit approval of the signed artifact, deployed commit, prices, countries, rollout size and monitoring owner. Monitor crashes, core-flow failures, email and billing reconciliation without logging relationship content or secrets. No calendar promise can replace store review or actual test participation.

## Execution and budget

After approval, write executable plans one subsystem at a time: backend closure first, usability corrections second, monetization third. Each task specifies files, interfaces, regression assertions and evidence of completion. Read relevant installed Next.js documentation before framework edits. Use the existing release worktree; preserve unrelated changes.

Use agents for bounded independent tasks when quota allows, with fresh review for ownership/migration and billing. Do not repeatedly send the entire repository/history to agents or retry quota failures. Keep shared schema/subscription changes sequential. Reuse the prior audit and rerun proportionate tests after real changes, with a full test/build/audit before deployment. Log progress in the release checklist so resumption does not repeat work.

## Review decision

Confirmed: buyer-only Premium, free partner linking, preserve the four complimentary grants, selected support address, and agent-assisted execution.

Proposed for approval: the milestone order, RevenueCat reuse, one new paid tier, evidence-led UX changes, legacy access preservation, and AI activation gate. Prices and limits remain explicitly blocked until their product/cost review; they do not block backend preparation. Independent design review was unavailable because two agents hit quota. No product code, billing configuration or publication is authorized by this draft alone.
