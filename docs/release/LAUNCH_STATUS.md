# Couplemetric launch status (updated 2026-10-23, evening)

Single source of truth for "where are we". Update this file whenever a step changes.

## Done
- [x] Safe-area fix live (Capacitor --safe-area-inset vars); owner sign-up reached DB 2026-10-21 02:21Z
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
- [x] `NATIVE_BILLING_ENABLED=true` in Vercel + redeployed (2026-10-20 22:27)
- [x] Reddit tester posts made (owner, 2026-10-20). Ongoing: reply to swap offers, opt into theirs, reply "done"
- [ ] Track now uses Google Group couplemetric-testers@googlegroups.com (anyone can join; members/posts visible to managers only). EVERY tester incl. the owner's 7 accounts must join https://groups.google.com/g/couplemetric-testers, then open https://play.google.com/apps/testing/app.couplemetric.android → Become a tester
- [x] Keep a feedback log (`docs/release/tester-feedback.md`) (who / what / what changed) for the production-access form
- [ ] Reach 12 opted-in testers; keep them 14 continuous days (clock started when track went active, 2026-10-20)

### Tester roster (group members -> must still opt in on Play)
| Person | Added to group | Opted in on Play |
|---|---|---|
| Owner (berkcan1992) | yes | ? |
| Partner | pending | pending |
| Friend: cdsenbil@gmail.com | 2026-10-23 | pending |
| Friend: kutayglr@gmail.com | 2026-10-23 | pending |

Strategy decision 2026-10-23: drop the 5 spare personal Gmail accounts (low usage = "insufficient
tester engagement" risk, and r/androiddev warns dev-swap opt-ins can create account-association
signals). Recruit real people instead: friends, family, coworkers, couples communities.

## Claude next
- [x] Build versionCode 8 / 1.1.1 with WebView origin couplemetric.app; uploaded to Alpha as draft (jar verified)
- [ ] **Owner: redeploy the web app to production** (the usual Vercel prod deploy; the classifier
      blocks it for Claude). The login/nav/quiz/overlay fixes are web-side and reach testers only
      after that deploy.
- [ ] Roll out Alpha draft **1.1.2 (9)** to testers (supersedes the never-released 1.1.1 (8) draft).
      Only the new launcher icon needs the new bundle; everything else ships with the web deploy.
- [x] **Fix wave from tester A feedback** (see `docs/release/tester-feedback.md`): landing page read
      the removed pre-migration cookie so users always looked signed out; landing nav lacked
      `safe-top` and had 28px buttons; `/quiz` rendered a 100dvh flow inside the shared header+footer;
      adaptive icon inset the background and shipped an opaque foreground. All fixed, 835 tests pass.
      Built, signed (jar verified) and uploaded as Alpha draft **1.1.2 (9)** with real release notes.
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

## Feedback log (14-day window)
Full verbatim log + triage: **`docs/release/tester-feedback.md`** (this is what we hand Google
on the production-access form). Summary:
- 2026-10-20 owner: header overlapped status bar → fixed (safe-area CSS vars), live.
- 2026-10-23 tester A (friend), 4 items: not staying logged in; top Log in button doesn't work and
  sits too high; quiz/onboarding steps need scrolling to reach Next; app icon looks unprofessional
  (inner square, should be one smooth surface like Libby/Spotify). **All four fixed in 1.1.2 (9)**,
  plus two more found while verifying (cookie notice covering the step CTA; offline page still
  linking to the old Vercel origin).
