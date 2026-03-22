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

Freemium model defined in `src/lib/subscription/tiers.ts`. Free tier: 5 exercises, 7-day history. Premium ($7.99/mo, $59.99/yr): unlimited. `PremiumGate` component blurs premium content for free users. Stripe integration at `src/lib/stripe/` and `src/app/api/stripe/`.

### Viral Mechanics

- Free quiz at `/quiz` with 8 relationship archetypes and percentile comparisons
- Shareable score cards + OG image API at `/api/og`
- Partner invite with "Challenge Your Partner" mechanic
- Referral system with premium rewards at `/refer`
- Milestone celebrations with confetti + share buttons
- Streak system with flame badge

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
