# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start Next.js dev server (Turbopack)
npm run build        # Production build
npm run build:check  # Build + verify
npm run lint         # ESLint
npm run db:push      # Push Drizzle schema to Supabase (loads .env.local via dotenv-cli)
npm run db:studio    # Open Drizzle Studio (visual DB browser)
npm run cap:sync     # Sync Capacitor native platforms
npm run cap:ios      # Open iOS project in Xcode
npm run cap:android  # Open Android project in Android Studio
```

No test runner is configured yet.

## Production

- **Live URL**: https://omnilife-relationship-optimizer.vercel.app
- **Deploy**: `npx vercel --prod --yes` (Vercel CLI, already authenticated)
- **DB**: Supabase PostgreSQL (project `rlanchnpacwxloheszse`, us-east-1)
- **Test account**: admin@omnilife.app / AdminTest123!

## Architecture

**Next.js 16 App Router** with three route groups:
- `(auth)` — login/register pages
- `(public)` — landing page, quiz, blog, pricing, legal pages (unauthenticated)
- `(dashboard)` — all app pages, protected by `requireAuth()` in the shared layout

Dashboard home is at `/overview` (not `/`). Root `/` serves the public landing page.

### Data Flow Pattern

Every dashboard page follows this structure:

1. **Server Component** (`page.tsx`) calls `requireAuth()` to get the user, then renders a client wrapper
2. **Client Component** (`*-client.tsx`, marked `"use client"`) handles interactivity and calls server actions
3. **Server Actions** (`actions.ts`, marked `"use server"`) perform DB operations via Drizzle and call `revalidatePath()`

### Scoring Engine (`src/lib/engine/`)

All pure functions, no side effects. Computed server-side when a daily log is submitted, then stored in the `scores` table.

- **Life Score** = weighted average of 4 pillars (vitality, growth, security, connection) × 10
- **Rel Score** = weighted average of 5 relationship dimensions (emotional, trust, fairness, stress, autonomy) × 10
- **Total Quality** = α × lifeScore + β × relScore − penalties (clamped 0–100)
- **Penalties**: redline violations (quadratic), imbalance (variance-based), budget overruns (linear)

### Recommendation Engine (`src/lib/recommendations/`)

Priority-ordered rules map score states → interventions. Exercise selection factors in the active scenario mode (exam, crisis, etc.) for category preferences and duration limits.

### Database

**Drizzle ORM** with `postgres` driver (not `@neondatabase/serverless`). Supabase PostgreSQL via **Transaction Pooler** (required for serverless). Schema in `src/lib/db/schema.ts` — 10 tables, 3 enums.

Tables: `users`, `daily_logs`, `scores`, `weekly_checkins`, `tasks`, `constraints`, `scenario_profiles`, `interventions`, `referrals`, `subscribers`

**Lazy singleton** in `src/lib/db/index.ts` via `getDb()` — delays creation until first call to avoid crashes during `next build` when `DATABASE_URL` isn't set.

### Auth

Cookie-based sessions. `createSession()` stores base64-encoded JSON `{userId, token, expiresAt}` in an httpOnly cookie (7-day expiry). `requireAuth()` reads the cookie, fetches the user from DB, and redirects to `/login` if missing.

### Subscription System

Three-tier freemium model in `src/lib/subscription/tiers.ts`:
- **Free**: 5 exercises, 7-day history, basic insights
- **Pro** ($4.99/mo, $39.99/yr): unlimited exercises, 90-day history, weekly reports
- **Premium** ($7.99/mo, $59.99/yr): everything in Pro + AI coaching, therapist export, partner features

`PremiumGate` component blurs premium content for free users. Stripe integration at `src/lib/stripe/` and `src/app/api/stripe/`.

### Viral Mechanics

- Free quiz at `/quiz` with 8 relationship archetypes and percentile comparisons
- Shareable score cards + OG image API at `/api/og`
- Partner invite with "Challenge Your Partner" mechanic
- Referral system with premium rewards at `/refer`
- Milestone celebrations with confetti + share buttons
- Streak system with flame badge

### AI Coaching (`src/lib/coaching/`)

Claude-powered relationship coach at `/coaching`. Premium feature. Uses streaming responses with conversation history stored per-user.

### Analytics (`src/lib/analytics/track.ts`)

Lightweight `trackEvent(name, properties, userId)` for key user actions (daily log submitted, milestone achieved, etc.). No external analytics SDK — events logged server-side.

### Milestones & Streaks

- **Streaks** (`src/lib/streaks/`) — `updateStreak()` called after each daily log, updates `currentStreak` and `longestStreak` in users table
- **Milestones** (`src/lib/milestones/`) — `checkMilestones()` returns newly achieved milestones (streak counts, log counts, score thresholds). Shown via `MilestoneToast` component with confetti

### Push Notifications (`src/lib/push/`)

Capacitor push plugin (`@capacitor/push-notifications`). Firebase FCM for Android, APNs for iOS. Registration and token management handled client-side.

### Data Export (`src/lib/export/`)

PDF export of user data at `/settings/export-pdf`. Generates downloadable report with scores, trends, and recommendations.

### Blog (`src/lib/blog/`)

MDX-based blog at `/blog` for SEO and content marketing. Static generation with `generateStaticParams`.

### Smart Logging

Daily log wizard at `/daily` with two modes:
- **Quick Mode** (5 steps, ~2 min) — asks mood, energy, connection, communication, trust. Derives growth, security, fairness, stress, autonomy from asked values
- **Detailed Mode** (11 steps, ~5 min) — asks all 9 dimensions + mood/energy + notes
- **Weekly Calibration** — after 5+ quick logs, once per week shows 4 auto-derived dimensions with recent averages for fine-tuning
- **Adaptive Prompting** — if mood drops 2+ points below recent average, auto-adds stress and security sliders in quick mode

Mode persists in localStorage. Default is quick.

### Native App (Capacitor)

Capacitor config at `capacitor.config.ts` — loads live Vercel URL in native WebView. Push notification + biometric plugins installed. Run `npx cap add ios && npx cap sync` to build. See `NATIVE_APP.md`.

## Key Conventions

- **shadcn/ui with Base UI** (not Radix). Use `render` prop instead of `asChild`:
  ```tsx
  // Correct
  <Button render={<Link href="/daily" />}>Log Today</Button>
  // Wrong
  <Button asChild><Link href="/daily">Log Today</Link></Button>
  ```

- **Server/Client boundary**: Never pass React components, functions, or class instances from Server Components to Client Components. Only pass plain data (strings, numbers, booleans, plain objects/arrays). Nav items with Lucide icons must live inside client components.

- **Next.js 16 async APIs**: `cookies()`, `headers()`, `params`, `searchParams` must all be `await`ed.

- **Drizzle numeric fields**: Weights are stored as `numeric(5, 4)` — stringify before inserting: `alphaWeight: weights.alpha.toString()`.

- **Dates**: Use `YYYY-MM-DD` strings (no timezone), not Date objects: `new Date().toISOString().split("T")[0]`.

- **UUIDs**: Generated app-side with `uuid` v4, not database-generated.

- **Scenario presets** are defined in `src/lib/scenarios/presets.ts` (6 built-in modes). Weight overrides are stored as JSONB in `scenarioProfiles`.

- **Lazy singletons**: Both `getDb()` and `getStripe()` use lazy initialization to avoid crashes during `next build` when env vars aren't set.

- **Mobile-first**: Use `min-h-[100dvh]` not `min-h-screen`. Add `touch-action: none` on slider wrappers. Use `viewport-fit: cover` for safe-area support.

- **Environment**: `.env.local` must contain `DATABASE_URL` with a Supabase **transaction pooler** connection string. Stripe vars are optional (app works without them, payments disabled). This file is gitignored. `drizzle-kit` does not auto-load `.env.local` — the npm scripts use `dotenv-cli` to handle this.

- **Stripe env var names**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID`, `NEXT_PUBLIC_APP_URL`. The config helper is at `src/lib/stripe/config.ts`. Always wrap Stripe API calls in try/catch — uncaught errors produce 500 with empty body.

- **DB migrations**: `drizzle-kit db:push` fails with CHECK constraints (drizzle-kit 0.31.x bug). Run migrations directly via Node.js script using the `postgres` package with `.env.local` loaded via `dotenv`.

- **Pathname detection in middleware**: To pass the current URL path to Server Components (e.g., for redirect guards in layouts), use Next.js middleware to set a custom request header: `requestHeaders.set("x-pathname", request.nextUrl.pathname)` with `NextResponse.next({ request: { headers: requestHeaders } })`. Then read via `headers().get("x-pathname")` in the Server Component. Setting headers on the RESPONSE does NOT work — must set on the REQUEST.

- **Onboarding redirect guard**: `src/app/(dashboard)/layout.tsx` redirects users with `onboardingCompleted=false` to `/onboarding`. It uses `x-pathname` from middleware to avoid an infinite redirect loop when already on `/onboarding`. The onboarding page lives at `(dashboard)/onboarding/` and is wrapped by the dashboard layout (shows sidebar + bottom nav).

- **Mobile safe areas (Capacitor)**: Header must have `safe-top` class (`padding-top: env(safe-area-inset-top)`) to avoid overlapping phone status bar. Bottom nav must have `safe-bottom` class (`padding-bottom: env(safe-area-inset-bottom)`) for home indicator. Both defined in `globals.css`. Viewport must have `viewport-fit: cover` (already set in `app/layout.tsx`).

- **Android WebView cookie persistence**: Override `MainActivity.java` to call `CookieManager.getInstance().setAcceptCookie(true)` in `onCreate` and `CookieManager.getInstance().flush()` in `onStop` to ensure session cookies survive app close/reopen.

- **Android Firebase crash fix**: Without `google-services.json`, `FirebaseInitProvider` crashes on startup. Suppress it in `AndroidManifest.xml` with `tools:node="remove"` on the provider, plus `firebase_messaging_auto_init_enabled=false` metadata. Keep the push plugin installed for future use.

- **Public layout back navigation**: `src/app/(public)/layout.tsx` has a `<BackButton>` client component (`src/components/back-button.tsx`) using `router.back()`. All public pages (pricing, terms, privacy) automatically get a back button.

- **Server actions must redirect after mutations**: Actions that only call `revalidatePath()` leave the user on the same page with no feedback. Always add `redirect("/destination")` after successful mutations (e.g., weekly check-in → `/overview`).

- **Auth password storage**: Uses custom bcrypt hashing — NOT Supabase Auth. Passwords are in `users.password_hash`. Password reset flow at `src/lib/auth/reset-actions.ts` uses UUID tokens stored in `password_resets` table (1hr expiry). Emails sent via Resend (`src/lib/email/index.ts`).

- **Stripe webhook events needed**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. The webhook handler is at `src/app/api/stripe/webhook/route.ts`. Do NOT enable IP restrictions on the Stripe API key — Vercel uses dynamic IPs.

- **RevenueCat (native in-app purchases)**: Handles iOS/Android purchases via `@revenuecat/purchases-capacitor`. Stripe remains for web. All RC client code is guarded with `Capacitor.isNativePlatform()`.
  - **Env vars**:
    - `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` — public Android API key (from RC dashboard → Projects → API Keys)
    - `NEXT_PUBLIC_REVENUECAT_IOS_KEY` — public iOS API key
    - `REVENUECAT_SECRET_KEY` — server-side secret key for REST API calls (sync.ts)
    - `REVENUECAT_WEBHOOK_SECRET` — authorization header value for webhook validation
  - **Webhook**: `POST /api/revenuecat/webhook`. Configure in RC dashboard → Project → Integrations → Webhooks. Set Authorization header to value of `REVENUECAT_WEBHOOK_SECRET`. Events handled: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`.
  - **RevenueCat dashboard setup required**:
    1. Create entitlements: `pro`, `premium`
    2. Create products in Google Play Console and App Store Connect:
       - `pro_monthly` ($4.99/mo), `pro_yearly` ($39.99/yr)
       - `premium_monthly` ($7.99/mo), `premium_yearly` ($59.99/yr)
    3. Create an offering and attach each product as a package with matching identifiers
    4. Attach products to their entitlements (pro products → `pro`, premium products → `premium`)
  - **Files**: `src/lib/revenuecat/index.ts` (client), `src/lib/revenuecat/sync.ts` (server sync), `src/app/api/revenuecat/webhook/route.ts` (webhook), `src/components/native-upgrade-button.tsx` (UI)
  - **Product ID mapping** (RC entitlement → app tier): `pro` → `"pro"`, `premium` → `"premium"`

- **Android release build**: Keystore at `android/app/omnilife-release.keystore`, alias `omnilife`. Password stored in env vars `KEYSTORE_PASSWORD` / `KEY_PASSWORD`. Use `export` (not inline assignment) due to `!` in password causing bash history expansion: `export KEYSTORE_PASSWORD='tempSifre81!' && export KEY_PASSWORD='tempSifre81!' && cd android && ./gradlew bundleRelease`. AAB output: `android/app/build/outputs/bundle/release/app-release.aab`. Current versionCode 3, versionName 1.0.2.

- **Android `onStop()` access modifier**: `BridgeActivity.onStop()` is `public` — override must also be `public`, not `protected`. Java compilation fails otherwise.

- **Optimization engine architecture**: `src/lib/engine/` contains a full Nelder-Mead optimizer (`optimizer.ts`) and Pareto frontier (`pareto.ts`). The optimizer is wired into daily log submission (`daily/actions.ts`) and runs after scoring. Pareto frontier drives a priority-8 recommendation rule (`recommendations/rules.ts`) — fires when current state is dominated by historical best. Both are surfaced in the Insights → Optimizer tab (`insights/insights-client.tsx`). The optimizer uses weighted-sum scalarization: `totalQuality = α×lifeScore + β×relScore − penalties`.

- **Next.js 16 proxy (was middleware)**: `src/middleware.ts` is deprecated in Next.js 16 — use `src/proxy.ts` with `export function proxy(request)` instead. The `x-pathname` header (used by dashboard layout for onboarding redirect guard) is set here. If this file stops executing, new users will hit an infinite redirect loop on login.

- **Scoring pipeline summary**: lifeScore = normalize(pillar weights) · [vitality, growth, security, connection] × 10. relScore = normalize(rel weights) · [emotional, trust, fairness, (10−stress), autonomy] × 10. Note stress is **inverted**. totalQuality = (α×lifeScore + β×relScore) − penalties, clamped [0,100]. Three penalty types: redline (quadratic, K=5), imbalance (variance×2), budget (linear).

## Next Steps & Planned Improvements

### High Priority
- **iOS build & App Store submission** — run `npx cap add ios && npx cap sync`, open in Xcode, configure signing with Apple Developer account, submit to App Store Connect
- **Firebase push notifications** — add Firebase project for Android (download `google-services.json` → `android/app/`), configure APNs for iOS. Currently suppressed to avoid crash; push plugin is installed
- **Partner features polish** — the partner invite/compare flow exists but needs UX refinement; divergence detection (`src/lib/engine/divergence.ts`) is computed but not prominently surfaced
- **Password reset email delivery** — Resend integration exists (`src/lib/email/`) but needs a verified sending domain in Resend dashboard

### Growth & Monetization
- **RevenueCat dashboard setup required** (code is done, needs manual config):
  1. Add env vars to Vercel: `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY`, `NEXT_PUBLIC_REVENUECAT_IOS_KEY`, `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_SECRET`
  2. In RevenueCat dashboard (app.revenuecat.com): create entitlements `pro` and `premium`
  3. Create products in Google Play Console: `pro_monthly` ($4.99/mo), `pro_yearly` ($39.99/yr), `premium_monthly` ($7.99/mo), `premium_yearly` ($59.99/yr)
  4. Create an offering in RC dashboard, attach 4 products as packages, link to entitlements
  5. Set webhook URL: `https://omnilife-relationship-optimizer.vercel.app/api/revenuecat/webhook` with Authorization header = `REVENUECAT_WEBHOOK_SECRET` value
  6. Google Play/Apple IAP required for in-app purchases — Stripe remains for web-only
- **Onboarding conversion funnel** — add analytics events for each onboarding step to identify drop-off; A/B test paywall placement
- **Referral rewards automation** — referral system exists at `/refer` but reward fulfillment (premium unlock) needs to be automated on referral conversion
- **Blog content** — MDX blog at `/blog` exists for SEO; needs actual articles about relationship health, communication, etc.

### Engine Improvements
- **Hard constraint enforcement** — currently redline violations are soft (penalty points). Consider adding hard blocks: if trust < 2, force trust-related exercises as the only option
- **Optimizer feedback loop** — after 30+ days, compare Nelder-Mead suggestions vs. actual outcomes to validate the model; surface accuracy metrics in Insights
- **Multi-day Pareto** — currently Pareto frontier is 2D (life vs rel). Extend to 3D (life, rel, trend/momentum) for richer frontier analysis
- **Couple-level optimization** — run optimizer jointly on both partners' data to find Pareto-optimal interventions for the couple, not just individuals

### UX & Polish
- **Offline mode** — log daily data offline, sync when connection restored (Capacitor + IndexedDB)
- **Notification scheduling** — daily reminder push notifications with smart timing based on user's typical logging hour
- **Dark mode** — theme toggle; Tailwind dark: classes need to be applied throughout
- **Tablet/desktop layout** — dashboard is mobile-first; sidebar nav exists but desktop layout needs refinement for larger screens
- **Onboarding skip** — allow experienced users to skip onboarding and go straight to dashboard
