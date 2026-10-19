# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start Next.js dev server (Turbopack)
npm run build        # Production build
npm run build:check  # Build + verify
npm run lint         # ESLint
npm test             # Vitest unit and integration tests
npm run test:e2e     # Playwright (authenticated cases require local credentials)
npm run check:secrets # Scan tracked source without printing secret values
npm run db:push      # Push Drizzle schema to Supabase (loads .env.local via dotenv-cli)
npm run db:studio    # Open Drizzle Studio (visual DB browser)
npm run cap:sync     # Sync Capacitor native platforms
npm run cap:ios      # Open iOS project in Xcode
npm run cap:android  # Open Android project in Android Studio
```

Read the installed Next.js guides under `node_modules/next/dist/docs/` before framework changes, as required by AGENTS.md.

## Production

- **Live URL**: https://omnilife-relationship-optimizer.vercel.app
- **Operational authority**: [1.0.3 closed-test checklist](docs/release/1.0.3-closed-test-checklist.md). Local verification does not confirm deployment, database health, configuration, signing or Play readiness. Follow its owner gates before deployment/submission.
- **DB**: Supabase PostgreSQL. Verify availability and TLS privately before deployment; historical pause reports are not current health evidence.
- **Test account**: set `E2E_EMAIL` and `E2E_PASSWORD` in your local environment; do not commit test credentials.

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

**Drizzle ORM** with the `postgres` driver. Supabase transaction pooling is the intended deployment connection. Schema in `src/lib/db/schema.ts` is authoritative for tables, enums and constraints.

The lazy client disables prepared statements for the shared transaction pooler, caps each instance at one connection and sets a 10-second connection timeout. The connection URL's TLS settings still require operator verification. Do not disable certificate verification as a workaround.

Verify concurrent queries and transactions against the intended pooler before deployment. [Supabase's postgres.js guide](https://supabase.com/docs/guides/database/postgres-js) warns about pipelining compatibility; the local mock suite and `select 1` probe do not establish live pooler compatibility.

**Lazy singleton** in `src/lib/db/index.ts` via `getDb()` — delays creation until first call to avoid crashes during `next build` when `DATABASE_URL` isn't set.

### Auth

Cookie-based sessions use a versioned HMAC-SHA-256 signed payload and a required server-only `SESSION_SECRET`. Sessions are signed, not encrypted, and expire after seven days. Verification rejects unsigned legacy cookies, malformed/altered payloads and expired signatures. `requireAuth()` fetches the authenticated database user or redirects to `/login`. Derive every action's identity from that user and enforce ownership in database predicates. Partner reads require reciprocal linkage and server-enforced access limits.

### Subscription System

Three-tier freemium model in `src/lib/subscription/tiers.ts`:
- **Free**: exercise limit 3, 7-day history, basic scores and partner linking
- **Pro** ($3.99/mo, $29.99/yr): full exercises, history, advanced insights and export
- **Premium** ($4.99/mo, $39.99/yr): everything in Pro + AI coaching, therapist export, partner features

`TIERS` defines current limits and web prices. `getUserTier()` accounts for expiry and active referral trials. Gates must also enforce access server-side. Stripe integration at `src/lib/stripe/` and `src/app/api/stripe/` is for web browsers. Android is free with access-only existing entitlements: no prices, purchase links, checkout, subscription-management controls or upgrade instructions.

### Viral Mechanics

- Free quiz at `/quiz` with 8 relationship archetypes and percentile comparisons
- Shareable score cards + OG image API at `/api/og`
- Partner invite with "Challenge Your Partner" mechanic
- Referral system with premium rewards at `/refer`
- Milestone celebrations with confetti + share buttons
- Streak system with flame badge

### AI Coaching (`src/lib/coaching/`)

Premium coaching at `/coaching` uses the Gemini integration. Confirm provider configuration, retention and disclosures through the release checklist before deployment; do not infer that the live service is enabled from source alone.

### Analytics (`src/lib/analytics/track.ts`)

Lightweight `trackEvent(name, properties, userId)` for key user actions (daily log submitted, milestone achieved, etc.). No external analytics SDK — events logged server-side.

### Milestones & Streaks

- **Streaks** (`src/lib/streaks/`) — `updateStreak()` called after each daily log, updates `currentStreak` and `longestStreak` in users table
- **Milestones** (`src/lib/milestones/`) — `checkMilestones()` returns newly achieved milestones (streak counts, log counts, score thresholds). Shown via `MilestoneToast` component with confetti

### Push Notifications (`src/lib/push/`)

Push support is dormant. The free Android release removes the push SDK, registration startup and notification permissions. Reintroducing push requires a separate implementation and privacy review.

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

Capacitor config at `capacitor.config.ts` loads the hosted Vercel origin in a native WebView, with a bundled offline fallback. Android source is tracked. See `docs/ANDROID_BUILD_CONFIG.md` for sync/build instructions and the release checklist for acceptance gates. Native Billing/RevenueCat/push SDKs and permissions are absent from this free release.

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

- **Environment**: Supply `DATABASE_URL` and a strong `SESSION_SECRET` privately. `.env.local` is gitignored; never print or commit its values. Stripe configuration is required for web purchases. `drizzle-kit` does not auto-load `.env.local`; npm database scripts use `dotenv-cli`. Configuration and live health remain owner gates.

- **Stripe env var names**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID`, `NEXT_PUBLIC_APP_URL`. The un-prefixed prices are Premium; Pro requires distinct Pro price IDs. Missing or ambiguous configuration fails closed without a fallback to another tier. Never return provider/driver error details to clients. Read `docs/billing-ownership-migration.md` before deploying the billing schema changes.

- **DB migrations**: Review committed migration SQL and its operator procedure; validate backups and reconciliation before applying production changes. Do not use a blanket schema push as release verification or improvise live database scripts.

- **Pathname detection in proxy**: To pass the current URL path to Server Components (e.g., for redirect guards in layouts), set a custom request header: `requestHeaders.set("x-pathname", request.nextUrl.pathname)` with `NextResponse.next({ request: { headers: requestHeaders } })`. Then read via `(await headers()).get("x-pathname")` in the Server Component. Set it on the request, not the response.

- **Onboarding redirect guard**: `src/app/(dashboard)/layout.tsx` redirects users with `onboardingCompleted=false` to `/onboarding`. It uses `x-pathname` from middleware to avoid an infinite redirect loop when already on `/onboarding`. The onboarding page lives at `(dashboard)/onboarding/` and is wrapped by the dashboard layout (shows sidebar + bottom nav).

- **Mobile safe areas (Capacitor)**: Header must have `safe-top` class (`padding-top: env(safe-area-inset-top)`) to avoid overlapping phone status bar. Bottom nav must have `safe-bottom` class (`padding-bottom: env(safe-area-inset-bottom)`) for home indicator. Both defined in `globals.css`. Viewport must have `viewport-fit: cover` (already set in `app/layout.tsx`).

- **Android WebView cookie persistence**: Override `MainActivity.java` to call `CookieManager.getInstance().setAcceptCookie(true)` in `onCreate` and `CookieManager.getInstance().flush()` in `onStop` to ensure session cookies survive app close/reopen.

- **Android Firebase**: Push/Firebase SDK startup is absent from the free release. Do not restore the removed plugin to solve historical startup guidance.

- **Public layout back navigation**: `src/app/(public)/layout.tsx` has a `<BackButton>` client component (`src/components/back-button.tsx`) using `router.back()`. All public pages (pricing, terms, privacy) automatically get a back button.

- **Server actions must redirect after mutations**: Actions that only call `revalidatePath()` leave the user on the same page with no feedback. Always add `redirect("/destination")` after successful mutations (e.g., weekly check-in → `/overview`).

- **Auth password storage**: Uses custom bcrypt hashing — NOT Supabase Auth. Passwords are in `users.password_hash`. Password reset flow at `src/lib/auth/reset-actions.ts` uses UUID tokens stored in `password_resets` table (1hr expiry). Emails sent via Resend (`src/lib/email/index.ts`).

- **Stripe webhook events needed**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. The webhook handler is at `src/app/api/stripe/webhook/route.ts`. Do NOT enable IP restrictions on the Stripe API key — Vercel uses dynamic IPs.

- **RevenueCat**: Client compatibility stubs are dormant; do not mount initialization or reinstall a purchase SDK. The retained server webhook/sync supports legacy access and deletion workflows with authentication and atomic provider-ownership checks. Historical provider secrets, if needed, remain server-only. Native purchase setup is a separate post-launch project.

- **Android release build**: Source declares versionCode 6 / versionName 1.0.3; verify availability in Play before signing. Use the existing authorized upload key through `KEYSTORE_PATH`, `KEYSTORE_ALIAS`, `KEYSTORE_PASSWORD`, `KEY_PASSWORD`, supplied privately. Never regenerate a key as a routine build step. Signing, device acceptance and artifact identity are separate owner gates. See `docs/ANDROID_BUILD_CONFIG.md` and the release checklist.

- **Android `onStop()` access modifier**: `BridgeActivity.onStop()` is `public` — override must also be `public`, not `protected`. Java compilation fails otherwise.

- **Optimization engine architecture**: `src/lib/engine/` contains a full Nelder-Mead optimizer (`optimizer.ts`) and Pareto frontier (`pareto.ts`). The optimizer is wired into daily log submission (`daily/actions.ts`) and runs after scoring. Pareto frontier drives a priority-8 recommendation rule (`recommendations/rules.ts`) — fires when current state is dominated by historical best. Both are surfaced in the Insights → Optimizer tab (`insights/insights-client.tsx`). The optimizer uses weighted-sum scalarization: `totalQuality = α×lifeScore + β×relScore − penalties`.

- **Next.js 16 proxy (was middleware)**: `src/middleware.ts` is deprecated in Next.js 16 — use `src/proxy.ts` with `export function proxy(request)` instead. The `x-pathname` header (used by dashboard layout for onboarding redirect guard) is set here. If this file stops executing, new users will hit an infinite redirect loop on login.

- **Scoring pipeline summary**: lifeScore = normalize(pillar weights) · [vitality, growth, security, connection] × 10. relScore = normalize(rel weights) · [emotional, trust, fairness, (10−stress), autonomy] × 10. Note stress is **inverted**. totalQuality = (α×lifeScore + β×relScore) − penalties, clamped [0,100]. Three penalty types: redline (quadratic, K=5), imbalance (variance×2), budget (linear).

## Next Steps & Planned Improvements

### Current release

Use [the release checklist](docs/release/1.0.3-closed-test-checklist.md) as the operational handoff. The app is named Couplemetric (package `app.couplemetric.android`, renamed from OmniLife/`com.omnilife.app` before first publish due to a trademark conflict); the deployment URL is unchanged for this release. Follow `NEXT_STEPS.md` for remaining owner gates and the separate post-launch backlog.

### Keepalive operations

`vercel.json` schedules `/api/keepalive` once daily at 08:00 UTC. Supply a strong server-only `CRON_SECRET` in the Vercel deployment environment. Vercel sends it as `Authorization: Bearer <CRON_SECRET>`; the route requires the exact header and returns 503 without configuration or 401 without valid authorization before accessing the database. The authenticated query is only `select 1`; failures expose a generic message. There is no GitHub backup scheduler. Owner deployment, scheduler invocation and database availability/TLS checks remain unverified. A successful ping does not guarantee provider pause prevention or validate application schema.

References: [Vercel cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Supabase pooler configuration](https://supabase.com/docs/guides/database/connecting-to-postgres).

### High Priority
- **iOS and native monetization/push** are separate post-launch projects requiring their own implementation, testing and privacy review.
- **Partner features polish** — the partner invite/compare flow exists but needs UX refinement; divergence detection (`src/lib/engine/divergence.ts`) is computed but not prominently surfaced
- **Password reset email delivery** — Resend integration exists (`src/lib/email/`) but needs a verified sending domain in Resend dashboard

### Growth & Monetization
- **AI coaching and web pricing configuration** require private production verification; source code alone does not establish live provider state. Keep current prices centralized in `TIERS`.
- **Onboarding conversion funnel** — add analytics events for each onboarding step to identify drop-off; A/B test paywall placement
- **Referral rewards** — fulfillment IS automated: `processReferral` (`src/lib/referrals/index.ts`) runs on referred signup and extends the referrer's `trialEndsAt` by 30 days (premium trial). Still missing: promised bonus tiers (e.g., 6 months at 5 referrals — stats only add +1 month at 5) and referral status transitions (records stay `signed_up`; nothing moves them to `rewarded`)
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
