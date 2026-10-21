# Couplemetric launch status (updated 2026-10-20 night)

Single source of truth for "where are we". Update this file whenever a step changes.

## Done
- [x] Secure base (Codex branch) + rename to Couplemetric deployed
- [x] Monetization v1.1.0 code (RevenueCat, couple plan, quota, push, biometric, share) merged
- [x] DB migration applied; QA fix wave merged (823+ tests)
- [x] Play Console: listing, all declarations, content rating, data safety, category, contact
- [x] Signed AAB 1.1.0 (versionCode 7) on closed track **Alpha**, approved by Google, track ACTIVE
- [x] Countries: all 178. Tester list "Couplemetric closed testers": 7 emails (owner + partner + own accounts)
- [x] Play subscription `premium`: base plans `premium-monthly` $4.99, `premium-yearly` $24.99, 7-day trial offers `trial`, all ACTIVE
- [x] RevenueCat: Play SA credentials valid; products `premium:premium-monthly` / `premium:premium-yearly` attached to `$rc_monthly` / `$rc_annual` and entitlement `premium`; webhook → https://couplemetric.app/api/revenuecat/webhook
- [x] Firebase SA key in Vercel; `/api/push/reminders` returns ok
- [x] Domain couplemetric.app bought (Vercel registrar), attached, HTTPS, www→apex 308
- [x] Resend domain verified; sender `hello@couplemetric.app`; test email delivered
- [x] Code: site URL, Stripe URLs, reset links, sitemap/robots/JSON-LD, Capacitor server.url → couplemetric.app
- [x] Reviewer account demo-shots-17383@example.com has manual Premium; Play sign-in details saved
- [x] Recruitment kit: `docs/release/closed-test-recruitment.md`

## Owner must do (blocked for Claude by permission classifier)
- [ ] `NATIVE_BILLING_ENABLED=true` in Vercel + redeploy → run `enable-native-billing.mjs` in scratchpad `play/`, then `npx vercel --prod --yes --archive=tgz`
- [ ] Post tester request on r/AndroidClosedTesting and r/TestMyApp (copy in recruitment kit) — reddit.com is blocked for Claude's browser
- [ ] Ask the 7 listed accounts to tap the opt-in link and install: https://play.google.com/apps/testing/app.couplemetric.android
- [ ] Reach 12 opted-in testers; keep them 14 continuous days (clock started when track went active, 2026-10-20)

## Claude next
- [ ] Build versionCode 8 with WebView origin couplemetric.app; upload to Alpha (draft via `play-api.mjs upload`), owner confirms rollout
- [ ] Polish sprint during the 14 days: onboarding ≤10 steps + skip, Insights radar chart, visual pass (QA report `docs/release/2026-10-20-web-qa-report.md`), recapture 03-insights screenshot
- [ ] License testers in Play (Setup → License testing) with owner emails so trial purchases are free; end-to-end sandbox purchase → `users.subscription_tier='premium'`, `subscription_source='revenuecat'`
- [ ] Verify Play "Changes in review" (privacy/delete URL update) cleared
- [ ] Day 14+: apply for production access (answers in recruitment kit), staged rollout 20%→100%
- [ ] GTM: quiz funnel, Reddit/Show HN/Product Hunt per plan; Vercel Pro when MRR > $20

## Key references
- Play app id 4974016479565108494, track Alpha 4698598256153899311, package app.couplemetric.android
- RevenueCat project proja9476b11, Android app app14baaea582, offering `default`
- SA keys (never commit): `C:\Users\berkc\.secrets\couplemetric\{play-publisher,firebase-admin}.json`
- Helper scripts: scratchpad `play/` (`play-api.mjs`, `create-subscription.mjs`, `set-firebase-env.mjs`, `enable-native-billing.mjs`)
