# Google Play Store Publishing Guide

Last updated: 2026-10-16. Verified source: `da4d67b`, including independently reviewed authorization, billing and inherited-file corrections plus archive line-ending reproducibility.

This is an operator guide for the free Android v1 release. Complete the [field-by-field declaration pack](google-play-data-safety.md) and every OWNER CONFIRMATION gate before submission. This document does not authorize a Play Console submission or production rollout.

The [1.0.3 closed-test checklist](release/1.0.3-closed-test-checklist.md) records source verification, the unsigned artifact hash, production prerequisites, device acceptance and Console steps. Publication remains **NO-GO** until deployment/migration/configuration, signing, authenticated device acceptance and owner declarations/testing are complete. Live checks on 2026-10-15 found stale purchase content and 404 responses for `/delete-account` and `/api/keepalive`; this source work did not deploy an update.

## Current State

- Capacitor 8 configured: `appId: app.couplemetric.android`, `appName: Couplemetric`
- Android source is tracked: code 6 / 1.0.3, compile/target API 36. A verified **unsigned inspection AAB** exists; no signed upload candidate or authenticated device acceptance is established.
- Capacitor dependencies: app, haptics, splash-screen, status-bar, browser. No active push-notification or purchase SDK in v1.
- App loads live Vercel URL in native WebView (`https://omnilife-relationship-optimizer.vercel.app`)
- `androidScheme: 'https'` not explicitly set (Capacitor 8 defaults to https)

## Prerequisites

- **Android Studio** installed (latest stable)
- Use the JDK/Gradle/Android SDK versions verified by the Android packaging task
- **Google Play Developer account** at [Play Console](https://play.google.com/console), with required identity and account checks completed by the owner
- Verified production deployment, signed-session secret, database transport settings, monitored privacy/support contact, and actual retention information

## Phase 1: Build the Android App

```bash
# Sync web assets and plugins to Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

The WebView loads the live deployment. Run `npm run build`, verify the deployed release commit and public routes, and complete native device tests before bundling. A local web build alone does not update Vercel or prove the AAB loads the approved server behavior.

## Phase 2: App Icons & Splash Screen

Option A — use `@capacitor/assets`:
```bash
npm install -D @capacitor/assets
# Place icon.png (1024x1024) and splash.png (2732x2732) in resources/
npx capacitor-assets generate --android
```

Option B — use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html):
- Upload 1024x1024 PNG, download generated icons
- Place in `android/app/src/main/res/mipmap-*` directories

## Phase 3: Configure Version & Signing

### Version (in `android/app/build.gradle`):
- `versionCode` — increment for EVERY upload to Play Store
- `versionName` — user-visible version string (e.g., "1.0.0")

### Existing upload key and signing environment

Use the existing owner-controlled upload key for this listing. Never generate a replacement key without the listing's approved key-reset process. Back it up securely outside version control.

Provide all four variables through the release environment or secret manager: `KEYSTORE_PATH`, `KEYSTORE_ALIAS`, `KEYSTORE_PASSWORD`, and `KEY_PASSWORD`. Do not print values or pass passwords as command arguments. See [verified Android build configuration](ANDROID_BUILD_CONFIG.md).

The tracked `android/app/build.gradle` fails closed when signing inputs are absent; release minification/resource shrinking are enabled. `-PallowUnsignedRelease=true` is for inspection only and must never be used for a Play upload candidate. Verify the final signed AAB and upload-certificate fingerprint before submission.

## Phase 4: Build Release Bundle

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

AAB format is required by Google Play (APKs no longer accepted for new apps).

## Phase 5: Confirm the Free Native Boundary

No Firebase/FCM setup is required for v1. Do not add a push or purchase SDK during release preparation. Inspect the generated Android manifest, dependency tree, and bundled plugin list after sync. Record the actual permissions and SDKs in the release evidence.

Test fresh-install and existing-entitlement accounts. Native landing, pricing, locks, prompts, and billing settings must not advertise, link to, or initiate external digital purchases. Existing server entitlements remain honored. Evidence: `src/lib/capacitor/platform.ts`, `src/components/__tests__/native-billing-policy.test.tsx`, and `src/components/__tests__/billing-platform-actions.test.tsx`.

## Phase 6: Play Console Listing

### App Details
- **App name**: Couplemetric (or chosen app name)
- **Short description draft**: Daily relationship check-ins, shared tasks, and personal reflection.
- **Full description draft**: Couplemetric helps adults reflect on relationship and wellbeing patterns through daily check-ins, scores, tasks, and guided exercises. Coaching is available to eligible accounts and may use AI. It is not therapy, diagnosis, or medical advice.
- **Category**: OWNER CONFIRMATION: choose the category matching the final listing and health declaration.
- **Content rating**: Complete the IARC questionnaire. Do not preselect Everyone / PEGI 3 or equate an 18+ target audience with the resulting content rating.
- **Identity**: OWNER CONFIRMATION: confirm the legal operator, store contact, regions, and the Couplemetric naming before production rollout.

### Store Assets Required
- **App icon**: 512x512 PNG (32-bit, no alpha)
- **Feature graphic**: 1024x500 PNG or JPG
- **Screenshots**: 2-8 per device type (phone required, tablet recommended)
  - Minimum: 320px, Maximum: 3840px on any dimension
  - Recommended: 1080x1920 (portrait phone)

### App Content Forms

Use [google-play-data-safety.md](google-play-data-safety.md) for every Data Safety, Health Apps, rating, ads, audience, app-access, privacy, and deletion field. Do not copy a blanket "data shared: none": Gemini terms, hosting settings, and partner flows need individual review.

Production URLs from `capacitor.config.ts`:

- [Privacy](https://omnilife-relationship-optimizer.vercel.app/privacy)
- [Terms](https://omnilife-relationship-optimizer.vercel.app/terms)
- [Account deletion](https://omnilife-relationship-optimizer.vercel.app/delete-account)
- [Sign in](https://omnilife-relationship-optimizer.vercel.app/login) and [password recovery](https://omnilife-relationship-optimizer.vercel.app/forgot-password)

OWNER CONFIRMATION: verify these exact deployed URLs without login, geofencing, or deployment protection. `/legal/privacy` is not the privacy route. In-app access is through the public footer and Settings → Data for deletion.

## Phase 7: In-App Payments

Android v1 offers no digital purchase flow. Stripe remains a web-only processor. See the [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en) before planning a future billing release; any applicable program exceptions require separate owner/legal review.

### Released v1 behavior

Native payment controls, price offers, and external upgrade directions are suppressed. Platform-sensitive UI waits for native detection; native purchase/restore SDK helpers are inactive. Do not direct Android users to web upgrades. Verify direct `/pricing` navigation and billing settings on device.

### Dormant post-v1 reference, not a launch step

RevenueCat/Google Play Billing integration needs its own implementation, testing, disclosure, and policy review. The historical product reference below is retained for the existing work in progress and is not a configured v1 offering. Do not execute this install command for v1:
```bash
npm install @revenuecat/purchases-capacitor
```
Historical product references: `pro_monthly` ($3.99), `pro_yearly` ($29.99), `premium_monthly` ($4.99), `premium_yearly` ($39.99).

Those amounts match the current web reference prices in `src/lib/subscription/tiers.ts`. They are not verified RevenueCat/Play offerings or a launch configuration; the owner must independently establish any future store catalog.

## Phase 8: Testing & Review

1. **Internal testing**: Owner uploads the verified AAB to the intended track after explicitly approving submission
2. **Pre-launch report**: Firebase Test Lab runs automated tests (check for crashes)
3. **Closed testing**: Owner configures the closed track, obtains actual opt-ins, maintains at least 12 continuously opted-in testers for 14 days where required, and completes the pre-launch report/feedback loop in the [release checklist](release/1.0.3-closed-test-checklist.md).
4. **Production**: Owner confirms eligibility, declaration answers, naming decision, and final rollout approval. Review timing is determined by Google.

### Common Review Issues
- Verify useful functioning app content on device; native plugins do not establish policy approval.
- Privacy policy must be accessible within the app at `/privacy`; owner must resolve the displayed retention/contact gates before launch.
- App must not crash on launch — test on multiple API levels

## Privacy and Deletion Release Gates

- [ ] OWNER CONFIRMATION: `ACCOUNT_DELETION_CONTACT_EMAIL` is a valid monitored privacy/support inbox. Test receipt and ownership-verification workflow before setting `ACCOUNT_DELETION_CONTACT_VERIFIED=true`. Rebuild/redeploy public privacy copy after configuration changes and recheck both pages.
- [ ] OWNER CONFIRMATION: inspect production Supabase daily-backup/PITR settings and any manual exports, record exact retention and restoration/deletion handling, and replace the privacy policy's unresolved retention statement with those facts. Do not assume a plan from repository configuration.
- [ ] OWNER CONFIRMATION: verify Gemini paid-service project status, sensitive-data handling, retention, regions, terms, and whether prominent disclosure/consent is required before the first coaching submission. Unpaid services are not an acceptable default for these personal/sensitive prompts.
- [ ] OWNER CONFIRMATION: inspect Vercel logs/drains, Resend, Stripe, and any historical RevenueCat records. Active database deletion does not prove provider erasure. Arrange an operator/provider deletion request for dormant store records if they exist.
- [ ] OWNER CONFIRMATION: verify database TLS and processor contracts; finalize Data Safety collected/shared/purpose choices using deployment evidence.
- [ ] Verify authenticated deletion with password and explicit confirmation, immediate active-record removal, session invalidation, surviving-partner isolation, and Stripe failure/retry behavior. Recovery emails must actually deliver in production.
- [ ] Record build, route, AAB, and device verification results and owner approvals. No Play Console settings are changed by this documentation task.

## Quick Reference

```bash
# Full build cycle
npx cap sync android
cd android && ./gradlew bundleRelease

# Debug build (for testing)
cd android && ./gradlew assembleDebug

# Check gradle tasks
cd android && ./gradlew tasks
```
