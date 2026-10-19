# Next Steps: Couplemetric

Updated 2026-10-16. The [1.0.3 closed-test checklist](docs/release/1.0.3-closed-test-checklist.md) is the authoritative operational handoff. Use it for evidence, current blockers and owner decisions. This roadmap does not authorize deployment or Play submission.

## Approved launch

Keep Couplemetric, package `app.couplemetric.android` and the existing hosted origin. Android is free with access-only existing paid entitlements. Native purchase controls, external payment links, Billing/RevenueCat SDKs and push startup/permissions are absent. Web Stripe remains available subject to private configuration and migration checks.

Source declares Android versionCode 6 / versionName 1.0.3. Local tests use Vitest; Playwright and smoke scripts support optional authenticated coverage through privately supplied `E2E_EMAIL` and `E2E_PASSWORD`. Source and local checks do not prove live database health, deployment state, signing identity, device acceptance or Play eligibility.

## Remaining release gates

- Follow the release checklist's credential rotation, strong production `SESSION_SECRET`, migration, backup, privacy, monitored-contact and provider configuration gates. Historical database pause claims are not current health evidence; the owner must verify current availability and TLS privately.
- Reconcile legacy billing ownership and run the documented read-only checks before deployment. See [billing ownership migration](docs/billing-ownership-migration.md); do not blindly assign a provider to ambiguous paid accounts or run an unreviewed schema push. Verify concurrent queries/transactions with the intended pooler: [Supabase documents a postgres.js pipelining compatibility risk](https://supabase.com/docs/guides/database/postgres-js) that local mocks and the constant keepalive read cannot validate.
- Configure a strong server-only `CRON_SECRET` in Vercel for the daily 08:00 UTC `/api/keepalive` job. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically. Missing configuration returns 503; absent/incorrect authorization returns 401. The authenticated query is only `select 1`, with generic failure output. Verify the deployed job privately; no GitHub scheduler is required. A ping neither proves schema correctness nor guarantees provider pause prevention. See [Vercel cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
- After owner approval and deployment prerequisites, verify public routes, account creation/login, daily logging, partner consent/limits, deletion, web billing and native purchase suppression against the intended hosted release. Use test accounts whose credentials stay out of logs and source.
- Sign with the existing authorized upload key via the four private environment variables in [Android build configuration](docs/ANDROID_BUILD_CONFIG.md). Verify artifact hash/certificate, version availability and final signed device acceptance, including offline recovery.
- Have the owner confirm privacy/retention and Play declarations, app access, contact monitoring, naming risk and testing eligibility. Follow the checklist for closed-test users, required continuous testing, feedback/pre-launch report triage and separate explicit production-rollout approval. No owner confirmation is inferred here.

## Separate post-launch backlog

These ideas preserve earlier planning context; they are not prerequisites or authorization for this free Android release.

- Improve partner invitation/comparison UX and surface divergence insights without adding native upsells.
- Review referral reward promises against the current 30-day trial extension, bonus tiers and status transitions before marketing larger rewards.
- Verify Resend sending-domain configuration and improve password-reset delivery feedback.
- Review web billing failure notifications and subscription-management UX after legacy ownership reconciliation.
- Improve error boundaries, responsive layouts and onboarding feedback. Offline data entry/sync is a separate feature; the current native fallback covers connection recovery.
- Validate optimizer recommendations against longitudinal outcomes; consider hard constraint behavior, richer Pareto analysis and couple-level optimization through separate domain review.
- Plan analytics and quiz-to-account attribution only after choosing data minimization, consent and privacy changes. Current logging does not establish measured funnel performance.
- Explore blog content, quiz share assets, short videos, search indexing and measured retention experiments after release readiness. Prior acquisition/MRR forecasts were assumptions, not measured results.
- Treat iOS, native subscriptions/RevenueCat and push notifications as separate projects. Any rename/domain/package change needs an explicit owner decision and migration plan; this launch keeps the existing identity.
