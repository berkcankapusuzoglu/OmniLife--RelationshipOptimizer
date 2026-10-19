# Phase 2 — Monetization build v1.1.0 (Couplemetric, versionCode 7)

Assumes the Couplemetric rename has landed (package `app.couplemetric.android`, Java dir `android/app/src/main/java/app/couplemetric/android/`). Every task: write the failing test first, run it (RED), implement, re-run (GREEN), then `npx tsc --noEmit && npm run lint`. Test style: vitest `environment: node`, `vi.hoisted` state + `vi.mock("@/lib/db")` returning a fake Drizzle chain, `PgDialect().sqlToQuery(predicate)` to assert WHERE clauses (see `src/lib/subscription/__tests__/billing-ownership.test.ts`), `renderToStaticMarkup` for components with `vi.mock("@capacitor/core")` (see `src/components/__tests__/native-free-release.test.tsx`).

Locked product decisions: Free + Premium only for new users (legacy `pro` readable, never downgraded). Premium $4.99/mo (`premium_monthly`), $24.99/yr (`premium_yearly`), 7-day free trial via Play offers; Stripe mirrors with trial_period_days 7. ONE subscription covers both linked partners (partner inherits while linked; revoked on unlink; ownership never transfers). Prices on Android come from the store, never hard-coded. Purchase UI gated by server flag `NATIVE_BILLING_ENABLED` AND native capability.

## Findings that shape the plan
- `android/capacitor.settings.gradle` and `android/app/capacitor.build.gradle` are **stale**: they still list `capacitor-push-notifications` and `revenuecat-purchases-capacitor` although neither is in `package.json`. `npx cap sync android` regenerates them; do not hand-edit.
- No biometric plugin is installed. Use `@capgo/capacitor-native-biometric@^8.9.0` (peer `@capacitor/core >=8.0.0`). `@revenuecat/purchases-capacitor@^13.7.4`, `@capacitor/push-notifications@^8.1.3`, `@capacitor/share@^8.0.3` all declare peer `>=8.0.0`.
- Vercel Hobby crons run at most once/day, so hourly reminders come from a GitHub Actions schedule hitting the endpoint with `CRON_SECRET` (precedent: `.github/workflows/keepalive.yml`).
- Couple-plan entitlement needs **no stored state**: derive it in `getUserTier()` from the reciprocally linked partner row; unlink revokes automatically; provider webhooks never touch the partner row, so ownership cannot transfer.
- `TIERS.pro` is referenced in pricing/landing/premium-gate/stripe/webhook. Keep the `pro` key (legacy readable), stop selling it.

## Wave 0 — Schema (one task, runs alone)

### Task 0: schema additions
Files: modify `src/lib/db/schema.ts`; modify `src/lib/db/__tests__/schema-integrity.test.ts`; generate `drizzle/0001_*.sql` via `npx drizzle-kit generate`.
Interfaces:
- `users` += `billingTrialEndsAt timestamp tz | null`, `reminderHourUtc integer | null`, `pushOptIn boolean default false`, `billingProductId text | null`, `trialReminderSentAt timestamptz | null`.
- `billingEvents` (`id text PK`, `provider text`, `receivedAt timestamptz default now`) — webhook idempotency.
- `pushTokens` (`token text PK`, `userId uuid notNull`, `platform text`, `createdAt`, `lastSeenAt`).
- `coachingUsage` (`userId uuid`, `day date`, `count integer default 0`, PK(userId, day)).
TDD: add table names to `EXPECTED_TABLES` and a column test for `users.billingTrialEndsAt` → RED → edit schema → GREEN. `npx vitest run src/lib/db`.
Commands: `npx drizzle-kit generate` (review SQL; no destructive statements). Also write `scripts/migrate-v1.1.0.mjs` (idempotent `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`, using `src/lib/db/connection-options.mjs`, reads `.env.local`) because drizzle-kit push is broken with CHECK constraints.
Acceptance: schema test green, generated SQL contains only ADD COLUMN / CREATE TABLE.

## Wave 1 — Server core (5 parallel tasks, disjoint files)

### Task 1 (A): feature matrix + couple-plan entitlement
Files: modify `src/lib/subscription/tiers.ts`, `src/lib/subscription/access.ts`, `src/lib/auth/tier-gate.ts`; delete `src/lib/subscription/couple-bonus.ts` (and fix its importers: `partner/page.tsx` display only — remove usage); create `src/lib/subscription/__tests__/feature-matrix.test.ts`, `src/lib/subscription/__tests__/couple-plan.test.ts`.
Interfaces:
```ts
// tiers.ts
export interface Features { dailyLog; basicScores; exerciseLimit: number /* per 7 days */; historyDays: number; compareDays: number; insights; weeklyCheckin; scenarios; constraints; partnerLinking; exportReports; aiCoaching; aiDailyMessageQuota: number; therapistExport }
free: exerciseLimit 5, historyDays 7, compareDays 7, insights false, scenarios/constraints/export/ai false, aiDailyMessageQuota 0, featureList ["Daily check-in & scores","Streaks","7-day history","5 exercises per week","Partner linking"]
premium: monthlyPrice 4.99, yearlyPrice 24.99, exerciseLimit Infinity, historyDays 90, compareDays 30, everything true, aiDailyMessageQuota 30, featureList ["Covers both partners","90-day history & trends","Optimizer & Pareto insights","Full exercise library","Partner divergence breakdown (30 days)","Scenarios & boundaries","AI coaching (30 messages/day)","Export & therapist reports"]
pro: unchanged values (legacy), + compareDays 30, aiDailyMessageQuota 0; add `export const SELLABLE_TIERS = ["premium"] as const`.
// access.ts
export interface Entitlement { tier: SubscriptionTier; via: "own" | "partner" | "trial" | "none"; expiresAt: Date | null; source: "stripe"|"revenuecat"|"manual"|null; ownerId: string }
export async function getEntitlement(userId: string): Promise<Entitlement>
export async function getUserTier(userId: string): Promise<SubscriptionTier> // = (await getEntitlement(userId)).tier
```
`getEntitlement`: one query selecting the user and (left join `partner` alias on `partner.id = users.partnerId AND partner.partnerId = users.id`) partner's tier/expiry/source. Own paid & unexpired → `via:"own"`; else own `trialEndsAt` future → premium `via:"trial"`; else partner paid & unexpired → partner's tier `via:"partner"`; else free. Legacy `pro` returned as `pro` whether own or inherited.
TDD (couple-plan.test.ts): partner premium + reciprocal link → premium/partner; non-reciprocal link → free; partner expired → free; own trial beats partner; after unlink → free; `via:"partner"` never writes. feature-matrix.test.ts: snapshot the three tiers; `canAccess("free","scenarios")===false`; `hasFeatureAccess` requiredTier for `insights` is `premium` (not `pro`).
Commands: `npx vitest run src/lib/subscription src/lib/auth/__tests__/authorization.test.ts`.
Acceptance: tier resolution covers own/trial/partner/unlink; no `pro` named as required tier anywhere.

### Task 2 (C): RevenueCat reconcile + webhook + ownership
Files: modify `src/lib/subscription/ownership.ts`, `src/lib/revenuecat/sync.ts`, `src/app/api/revenuecat/webhook/route.ts`; create `src/lib/revenuecat/reconcile.ts`, `src/lib/revenuecat/__tests__/reconcile.test.ts`; extend `src/lib/subscription/__tests__/billing-ownership.test.ts` (add `insert`/`transaction` to the db mock).
Interfaces:
```ts
// reconcile.ts (server-only)
export const ENTITLEMENT_ID = "premium"; export const PRODUCT_IDS = { premium_monthly: "premium", premium_yearly: "premium", pro_monthly: "pro", pro_yearly: "pro" } as const;
export async function fetchSubscriber(appUserId: string): Promise<RCSubscriber | null> // GET /v1/subscribers/{id}, Bearer REVENUECAT_SECRET_KEY, X-Platform: android, cache no-store; null on 404; throws on 5xx/network
export function resolveFromSubscriber(s: RCSubscriber, now: Date): { tier; expiresAt: Date|null; productId: string|null; trialEndsAt: Date|null; billingIssue: boolean }
export async function reconcileRevenueCatUser(appUserId: string, opts?: { now?: Date }): Promise<"granted"|"advanced"|"expired"|"unchanged"|"skipped-unowned">
```
Writes reuse `canAdvanceRevenueCat(expiresAt)` for grants (also set `billingProductId`, `billingTrialEndsAt`) and `and(eq(source,"revenuecat"), lte(expiresAt, now))` for revocation; manual/stripe rows never touched. Add `ownership.ts` helper `revenueCatExpiredBefore(now)`.
Webhook: auth header check unchanged; parse `event.id`, `type`, `app_user_id`, `transferred_from/to`; **do not trust event fields for state** — call `reconcileRevenueCatUser` for `app_user_id` (and both transfer ids on `TRANSFER`, every alias on `SUBSCRIBER_ALIAS`) for INITIAL_PURCHASE, RENEWAL, UNCANCELLATION, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE, TRANSFER, SUBSCRIBER_ALIAS; others logged/200. Idempotency: `insert into billing_events ... on conflict do nothing returning id`; empty → 200 `{duplicate:true}`; reconcile failure → delete the event row and return 500 so RC retries. `sync.ts` keeps `syncRevenueCatEntitlement()` as a `"use server"` wrapper: `requireAuth()` → `reconcileRevenueCatUser(user.id)`.
TDD (reconcile.test.ts): RC subscriber fixtures for purchase, trial (period_type `trial` → `billingTrialEndsAt`), cancelled-still-active, grace (billing_issues_detected_at, expiry extended → advanced), account hold/expiry past → expired, refund → expired, 404 → unchanged, 500 → throws. Webhook tests: duplicate `event.id` → one reconcile; reordered RENEWAL → unchanged; wrong user id → 200 no write; deleted account → 200; TRANSFER reconciles both ids; REST wins over event fields.
Acceptance: all event types reconcile from REST, idempotent by `event.id`, never write to a stripe/manual-owned or partner row.

### Task 3 (D): Stripe mirror
Files: modify `src/lib/stripe/config.ts`, `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts`, `.env.example`; modify `src/lib/subscription/__tests__/checkout-config.test.ts`.
Interfaces: env `STRIPE_PREMIUM_MONTHLY_PRICE_ID`, `STRIPE_PREMIUM_YEARLY_PRICE_ID` (new $4.99/$24.99 prices), `STRIPE_LEGACY_PREMIUM_PRICE_IDS`, `STRIPE_LEGACY_PRO_PRICE_IDS` (comma lists; keep old `STRIPE_MONTHLY_PRICE_ID`/`STRIPE_YEARLY_PRICE_ID`/`STRIPE_PRO_*` accepted as legacy aliases for one release). `getStripePriceId(interval, tier="premium")` throws for `tier:"pro"`; `getStripeTierForPriceId` resolves legacy ids so renewals keep their tier. Checkout: reject `tier!=="premium"` with 400; `subscription_data.trial_period_days: 7` only when `!user.stripeCustomerId`; `customer: user.stripeCustomerId` when present; `allow_promotion_codes: true`. Webhook: `customer.subscription.updated` with `status==="trialing"` sets `billingTrialEndsAt`.
TDD: pro checkout → 400 before touching Stripe; fresh user → `trial_period_days:7`; returning customer → no trial; legacy price id still maps; unknown price ignored.
Acceptance: only Premium purchasable on web, 7-day trial for first-time customers; legacy subs keep renewing.

### Task 4 (G): AI coaching quota
Files: create `src/lib/coaching/quota.ts`, `src/lib/coaching/__tests__/quota.test.ts`; modify `src/app/(dashboard)/coaching/actions.ts`.
Interfaces:
```ts
export async function consumeCoachingQuota(userId: string, limit: number, day = todayUtc()): Promise<{ allowed: boolean; used: number; limit: number }>
// single statement: insert into coaching_usage(user_id, day, count) values (.., 1) on conflict (user_id, day) do update set count = coaching_usage.count + 1 where coaching_usage.count < $limit returning count
export function coachingModel(): string // process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
```
`sendCoachingMessage`: `limit = TIERS[tier].features.aiDailyMessageQuota` (from `getEntitlement`); 0 → gated error; exhausted → `{ error: "You've used today's 30 coaching messages. Resets at midnight UTC." }`; no `GEMINI_API_KEY` or provider error → `{ error: "The coach is unavailable right now. Nothing was charged against your daily limit." }` and refund the counter, no static fallback; cap `userMessage` at 2000 chars, history last 6 turns, `maxOutputTokens 400`.
Acceptance: atomic per-user daily cap, honest unavailable message, no silent static reply.

### Task 5 (E-server): push token store, FCM sender, reminder job
Files: create `src/lib/push/fcm.ts`, `src/lib/push/reminders.ts`, `src/lib/push/__tests__/{fcm,reminders}.test.ts`, `src/app/api/push/register/route.ts`, `src/app/api/push/reminders/route.ts`, `.github/workflows/push-reminders.yml`; modify `.env.example`.
Interfaces:
```ts
// fcm.ts — no new dependency: RS256 JWT via node:crypto, exchange at https://oauth2.googleapis.com/token, POST https://fcm.googleapis.com/v1/projects/{project}/messages:send
export async function sendPush(token: string, msg: { title: string; body: string; data?: Record<string,string> }): Promise<"sent"|"unregistered"|"failed">
// reminders.ts
export function pickDailyReminderUsers(rows, nowUtc): string[]  // pushOptIn && reminderHourUtc === now.getUTCHours() && lastLogDate < today
export function pickTrialDay5Users(rows, nowUtc): string[]       // billingTrialEndsAt between now+36h and now+60h and trialReminderSentAt null
export async function runReminders(nowUtc = new Date()): Promise<{ daily: number; trial: number }>
```
Env: `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON_B64`. Routes: `POST /api/push/register` (`requireAuth`, body `{token, platform}` validated, upsert token, set `pushOptIn:true`, compute `reminderHourUtc` = modal hour of last 14 `dailyLogs.createdAt`, default 20); `DELETE` removes token + `pushOptIn:false`; `GET /api/push/reminders` guarded exactly like `src/app/api/keepalive/route.ts`. Workflow: hourly curl with `CRON_SECRET` against `NEXT_PUBLIC_APP_URL`.
Acceptance: hourly job sends one daily reminder per opted-in user at their hour and one trial-day-5 reminder per trial.

## Wave 2 — Client surfaces (4 parallel tasks, disjoint files)

### Task 6 (B): RevenueCat SDK + paywall + manage/restore + flag
Files: `package.json` (+`@revenuecat/purchases-capacitor@^13.7.4`), create `src/lib/billing/flags.ts` (server: `nativeBillingEnabled = () => process.env.NATIVE_BILLING_ENABLED === "true"`), `src/lib/revenuecat/client.ts`, `src/components/native-paywall.tsx`, `src/components/restore-purchases-button.tsx`, `src/components/manage-subscription-button.tsx`, `src/app/api/billing/manage/route.ts`; modify `src/lib/revenuecat/index.ts` (re-export client), `src/components/revenuecat-init.tsx`, `src/components/native-upgrade-button.tsx`, `src/app/(public)/pricing/page.tsx`, `src/app/(public)/pricing/pricing-client.tsx`, `src/app/(dashboard)/layout.tsx` (mount `<RevenueCatInit userId enabled={nativeBillingEnabled()} />`), `src/app/(dashboard)/settings/page.tsx` + `settings-client.tsx` (billing tab only), `src/app/(public)/delete-account/delete-account-client.tsx` (Play link).
Interfaces:
```ts
// client.ts ("use client"; dynamic import of @revenuecat/purchases-capacitor so web bundles never load it)
export type BillingPackageId = "premium_monthly" | "premium_yearly";
export type PurchaseOutcome = { status: "success" } | { status: "cancelled" } | { status: "pending" } | { status: "already-owned" } | { status: "error"; code: string; message: string };
export async function configureRevenueCat(userId: string): Promise<boolean>   // once per page load; false when !isNativePlatform() or no NEXT_PUBLIC_REVENUECAT_ANDROID_KEY
export async function loadOffering(): Promise<{ packages: Array<{ id: BillingPackageId; priceString: string; period: "P1M"|"P1Y"; trialDays: number|null }> } | { error: "no-offering" | "not-configured" | "network" }>
export async function purchase(id: BillingPackageId): Promise<PurchaseOutcome>  // map PURCHASES_ERROR_CODE: PURCHASE_CANCELLED_ERROR→cancelled, PAYMENT_PENDING_ERROR→pending, PRODUCT_ALREADY_PURCHASED_ERROR→already-owned, NETWORK_ERROR/STORE_PROBLEM_ERROR→error
export async function restore(): Promise<{ active: boolean } | { error: string }>
export async function managementUrl(): Promise<string | null>
```
`NativePaywall` props `{ userId, enabled }`: renders only when `enabled && native`; states: loading, `no-offering` ("Plans are not available yet"), `not-configured` ("Purchases are unavailable in this build"), list with yearly preselected ("Both of you — {priceString}/yr", "7-day free trial" only when `trialDays`), buttons disabled while in flight, outcome messages for cancelled (silent), pending, already-owned (triggers restore), error. On success: `await syncRevenueCatEntitlement(); router.refresh()`. Restore button always visible. `ManageSubscriptionButton` props `{ source, productId }`: `revenuecat` → `managementUrl()` else Play subscriptions URL with `package=app.couplemetric.android` opened via `@capacitor/browser`; `stripe` → existing portal; `manual` → "Complimentary access". `pricing/page.tsx` passes `nativeBilling={nativeBillingEnabled()}` and `entitlement`; `PricingClient` shows Free + Premium only, hides Pro card (shows "Legacy Pro — Manage Subscription" when `currentTier==="pro"`), native branch renders `NativePaywall` when `nativeBilling` else the current neutral copy; web branch keeps Stripe buttons, Premium copy "7-day free trial, covers both partners". Settings billing tab shows "Included with {partnerName}'s Premium" when `via==="partner"`.
TDD (new `src/components/__tests__/native-billing.test.tsx`): flag off + native → no `$`, no buttons; flag on + native + offering → both packages with store `priceString`, no hard-coded `4.99`; cancelled → no error text; pending/already-owned/no-offering/no-key states; `configure` called once per userId; web never imports the plugin. `src/lib/revenuecat/__tests__/client.test.ts`: error-code mapping table.
Acceptance: Android shows store-priced Premium only when server flag and native bridge agree, with restore/manage and explicit error states.

### Task 7 (A-pages): server enforcement + truthful copy
Files: modify `src/app/(dashboard)/exercises/{page.tsx,actions.ts,exercises-client.tsx}`, `insights/page.tsx`, `overview/page.tsx`, `compare/{page.tsx,actions.ts}`, `scenarios/actions.ts`, `constraints/actions.ts`, `settings/actions.ts` (`exportData`), `partner/page.tsx`, `partner/partner-client.tsx`, `src/app/(public)/invite/[code]/invite-client.tsx`, `src/app/(public)/landing-client.tsx`, `src/components/premium-gate.tsx`, `src/components/upgrade-prompt.tsx`; create `src/lib/subscription/history.ts`, `src/lib/subscription/__tests__/{history,server-gates}.test.ts`.
Interfaces: `historyCutoff(tier, now): string /* YYYY-MM-DD */`; `exercisesRemainingThisWeek(tier, completedLast7Days): number`. Insights/overview/compare query with `gte(date, historyCutoff)`; `compare` uses `compareDays`; `completeExercise` rejects when weekly count ≥ limit; `activateScenario`, `addConstraint`, `exportData` call `hasFeatureAccess` and return `{error}`; `PremiumGate`: server passes `null` data for locked sections and the gate renders a static illustration (no blurred real data); copy: delete couple-bonus mentions, "Pro" wording, "14-day" claims; `UpgradePrompt` shows no price on native.
Acceptance: every Premium feature is refused on the server for free users and allowed for own/partner Premium.

### Task 8 (E-client): push client + pre-prompt + notification settings
Files: `package.json` (+`@capacitor/push-notifications@^8.1.3`), modify `src/lib/push/capacitor.ts`, `src/components/capacitor-init.tsx`, `src/app/(dashboard)/daily/{actions.ts,daily-client.tsx}`; create `src/components/notification-preprompt.tsx`, `src/components/notification-settings.tsx`, `src/components/__tests__/push-client.test.tsx`.
Interfaces: `enablePushNotifications(): Promise<"granted"|"denied"|"unsupported">` (checkPermissions → requestPermissions → register → on `registration` POST `/api/push/register`); `disablePushNotifications()`; `submitDailyLog` returns `isFirstLog: boolean`; `NotificationPrePrompt` shows once (localStorage `cm.pushPrompted`) after the first log on native only, never on launch; `CapacitorInit` only wires `pushNotificationActionPerformed` → `router.push(data.path)` and must not request permission.
Acceptance: permission asked only after first log; token reaches the server.

### Task 9 (F): share, biometric lock, haptics
Files: `package.json` (+`@capacitor/share@^8.0.3`, `@capgo/capacitor-native-biometric@^8.9.0`); create `src/lib/capacitor/{share,haptics,biometric}.ts`, `src/components/biometric-lock.tsx`, `src/components/biometric-settings.tsx`, `src/lib/capacitor/__tests__/native-extras.test.ts`; modify `src/app/(public)/quiz/result/result-client.tsx`, `src/components/share-score.tsx`.
Interfaces: `shareCard({title,text,url})` → `Share.share` on native, `navigator.share` → clipboard fallback on web; `hapticScoreReveal()` → `Haptics.impact({style:"MEDIUM"})` once per mount when native; `isBiometricAvailable()`, `verifyIdentity(reason)`; `BiometricLock` (mounted in root layout in Wave 3) checks pref `cm.biometricLock` on `App.appStateChange` active → fullscreen overlay until `verifyIdentity` resolves.
Acceptance: three native-only behaviours, zero effect on web.

## Wave 3 — Integration, Android, tests rewrite, owner checklist

### Task 10 (H + test rewrite): Android config, mounts, signed build
Files: modify `android/app/src/main/AndroidManifest.xml` (add `com.android.vending.BILLING`, `POST_NOTIFICATIONS`, `USE_BIOMETRIC`, `VIBRATE`; FCM default channel meta-data), `android/build.gradle` (`classpath 'com.google.gms:google-services:4.4.3'`), `android/app/build.gradle` (`versionCode 7`, `versionName "1.1.0"`, google-services plugin applied only when `google-services.json` exists), `src/app/layout.tsx` (mount `BiometricLock`), `settings-client.tsx` (mount `NotificationSettings`, `BiometricSettings` in a "Device" tab), docs updates (`docs/release/1.1.0-monetization-checklist.md`, `docs/ANDROID_BUILD_CONFIG.md`).
Codex tests to **rewrite, not delete**:
- `src/components/__tests__/native-free-release.test.tsx` → `native-billing-policy.test.tsx`: keep every `expectNoBilling` assertion under flag off (old clients), add flag-on cases; drop "Go Pro" expectations; keep the hydration-safety case.
- `src/components/__tests__/native-startup.test.tsx` → `configure` **is** called exactly once when native+flag+userId, never on web, never twice; push still not requested at launch.
- `src/components/__tests__/billing-platform-actions.test.tsx` → native manage opens the Play URL via Browser plugin, web opens the portal; Stripe checkout payload is `{"priceType":"yearly","tier":"premium"}`.
- `src/components/__tests__/pricing-page.test.tsx` → add `nativeBilling` prop assertions.
Commands: `npm ci && npm test && npm run lint && npx tsc --noEmit && npm run build && npm run check:secrets`; `npx cap sync android`; signed build per `docs/ANDROID_BUILD_CONFIG.md`; `jarsigner -verify`; bundletool manifest check → versionCode 7.
Acceptance: green suite, AAB versionCode 7 signed with the upload key, manifest shows BILLING + POST_NOTIFICATIONS.

### Task 11 (I): owner dashboard checklist (`docs/release/1.1.0-monetization-checklist.md`)
1. **Play Console** → app `app.couplemetric.android` → Monetize → Subscriptions → Create: Product ID `premium`, name "Couplemetric Premium". Base plans `premium-monthly` (1 month, $4.99, grace 7 days ON, account hold ON, resubscribe ON) and `premium-yearly` (1 year, $24.99). Each base plan → Add offer `free-trial-7d`, eligibility "New customer acquisition", Free trial 7 days → Activate. RevenueCat product identifiers become `premium:premium-monthly` / `premium:premium-yearly`; set RevenueCat **package** identifiers to `premium_monthly` / `premium_yearly`. Setup → License testing → add ≥2 Gmail testers. Setup → API access → link Google Cloud project → service account → Users & permissions → invite SA with "View financial data" + "Manage orders and subscriptions".
2. **Google Cloud** → enable "Google Play Android Developer API" → service account key JSON (never commit).
3. **RevenueCat** → Apps → + Google Play → package `app.couplemetric.android` → upload SA JSON → Products → Import → Entitlements → `premium` → attach both → Offerings → `default` → packages `premium_monthly`/`premium_yearly` → Current. API keys → `goog_…` → `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY`. Webhooks → `/api/revenuecat/webhook`, Authorization = `REVENUECAT_WEBHOOK_SECRET`, Sandbox+Production.
4. **Stripe** → Couplemetric Premium prices $4.99/mo, $24.99/yr → `STRIPE_PREMIUM_MONTHLY_PRICE_ID`/`_YEARLY_`; old ids → `STRIPE_LEGACY_*`; archive Pro prices; Customer portal allows cancel + payment update.
5. **Firebase** → project (same Cloud project) → Android app `app.couplemetric.android` → `google-services.json` → `android/app/`; service account private key → base64 → `FIREBASE_SERVICE_ACCOUNT_JSON_B64`, `FIREBASE_PROJECT_ID`.
6. **Gemini**: confirm `GEMINI_MODEL` exists via the models list endpoint.
7. **Vercel env**: `NATIVE_BILLING_ENABLED=false` (flip after step 9), RevenueCat keys, Stripe ids, Firebase vars, `GEMINI_MODEL`; then run `scripts/migrate-v1.1.0.mjs` after a Supabase backup.
8. Upload AAB to the **closed** track; on device: register → first log (pre-prompt) → Pricing → yearly shows store price with trial → purchase with test card → RC Sandbox shows it → webhook 200 → `users.subscription_tier='premium'`, `subscription_source='revenuecat'`, partner shows "Included with …'s Premium" → unlink → partner free → Manage opens Play → cancel → premium until expiry → account hold → free.
9. Flip `NATIVE_BILLING_ENABLED=true`, redeploy, repeat on the store build.
