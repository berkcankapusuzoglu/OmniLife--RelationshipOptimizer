# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start Next.js dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Push Drizzle schema to Supabase (loads .env.local via dotenv-cli)
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

No test runner is configured yet.

## Architecture

**Next.js 16 App Router** with two route groups:
- `(auth)` — public login/register pages
- `(dashboard)` — all app pages, protected by `requireAuth()` in the shared layout

### Data Flow Pattern

Every dashboard page follows this structure:

1. **Server Component** (`page.tsx`) calls `requireAuth()` to get the user, then renders a client wrapper
2. **Client Component** (`*-client.tsx`, marked `"use client"`) handles interactivity and calls server actions
3. **Server Actions** (`actions.ts`, marked `"use server"`) perform DB operations via Drizzle and call `revalidatePath()`

### Scoring Engine (`src/lib/engine/`)

All pure functions, no side effects. Computed server-side when a daily log is submitted, then stored in the `scores` table.

- **Life Score** = weighted average of 4 pillars (vitality, growth, security, connection) × 10
- **Rel Score** = weighted average of 5 relationship dimensions (emotional, trust, fairness, stress, autonomy) × 10
  - **Stress is inverted**: `w.stress * (10 - dims.stress)` — high stress = bad score
- **Total Quality** = α × lifeScore + β × relScore − penalties (clamped 0–100)
- **Penalties**: redline violations (quadratic), imbalance (variance-based), budget overruns (linear)
- **Trend Detection** (`trends.ts`): detects 3+ consecutive day declines per dimension, returns `ConstraintViolation`-compatible objects with `type: "trend"`
- **Crisis Alerts** (`alerts.ts`): three rules — `declining_quality` (5+ days), `sustained_low` (below 3 for 3+ days), `dimension_collapse` (4+ point drop in one day)
- **Divergence** (`divergence.ts`): compares two partners' dimension scores, flags dimensions with 3+ point gap
- **Impact Tracking** (`impact.ts`): analyzes scoreBefore/scoreAfter on completed interventions to compute avg improvement per exercise
- **Weight Calibration** (`calibration.ts`): after 14+ logs, uses Pearson correlation between dimensions and TotalQuality to suggest weight adjustments

### Recommendation Engine (`src/lib/recommendations/`)

Priority-ordered rules map score states → interventions. Exercise selection factors in the active scenario mode (exam, crisis, etc.) for category preferences and duration limits.

- **Action Plan** (`action-plan.ts`): maps score gaps to specific exercises with time estimates
- **Joint Exercises** (`joint-exercises.ts`): filters exercises tagged `isJoint: true` targeting overlapping weak dimensions between partners

### Daily Log Submission Pipeline

When `submitDailyLog()` runs, it performs these steps in order:
1. Insert daily log record
2. Fetch user constraints from DB → `computeAllPenalties()`
3. Compute scores (lifeScore, relScore, totalQuality)
4. Detect trend violations from last 5 logs
5. Store scores + all violations (constraint + trend)
6. If partner linked: detect divergence, insert `partnerSyncEvent` if found
7. Backfill `scoreAfter` on pending interventions (those with scoreBefore but no scoreAfter)
8. Update streak, track analytics, check milestones

### Database

**Drizzle ORM** with `postgres` driver (not `@neondatabase/serverless`). Supabase PostgreSQL via **Transaction Pooler** (required for serverless). Schema in `src/lib/db/schema.ts` — 11 tables, 3 enums.

Tables: `users`, `referrals`, `dailyLogs`, `weeklyCheckins`, `scores`, `tasks`, `constraints`, `scenarioProfiles`, `interventions`, `subscribers`, `partnerSyncEvents`, `coachingSessions`

**Lazy singleton** in `src/lib/db/index.ts` via `getDb()` — delays creation until first call to avoid crashes during `next build` when `DATABASE_URL` isn't set.

### Auth & Access Control

Cookie-based sessions. `createSession()` stores base64-encoded JSON `{userId, token, expiresAt}` in an httpOnly cookie (7-day expiry). `requireAuth()` reads the cookie, fetches the user from DB, and redirects to `/login` if missing.

**Tiered access** (free / pro / premium):
- `src/lib/subscription/tiers.ts` — defines feature limits per tier
- `src/lib/subscription/access.ts` — `getUserTier()`, `getFeatureLimits()`, `hasAccess()`
- `src/lib/auth/tier-gate.ts` — `hasFeatureAccess(userId, feature)` server-side gating
- `src/components/premium-gate.tsx` — client-side gate component
- Free: daily logging, 3 exercises/week, 7-day insights
- Pro: all features except AI coaching and therapist export
- Premium: everything

### Onboarding

5-step wizard at `/onboarding`: goals → 9-dimension self-assessment (becomes first log) → scenario selection → optional constraints → optional partner invite. Dashboard layout redirects to `/onboarding` if `!user.onboardingCompleted`.

### Partner System

- Users link via invite codes (`partnerInviteCode` on users table)
- `coupleId(userA, userB)` in `src/lib/utils.ts` produces deterministic couple ID (sorted UUID join)
- Divergence alerts inserted as `partnerSyncEvents` on daily log submission
- Joint dashboard at `/partner/dashboard` with side-by-side scores
- Partner comparison on Pareto chart in insights

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

- **Constraint conversion**: DB constraints have numeric strings — always convert with `Number()` before passing to engine functions: `minValue: c.minValue ? Number(c.minValue) : undefined`.

- **Exercise `isJoint` flag**: Exercises tagged `isJoint: true` are suitable for both partners. Used by `getJointExercises()` for the joint dashboard.

- **Intervention scoreBefore/scoreAfter**: `completeExercise()` captures `scoreBefore` from the latest daily log. `submitDailyLog()` backfills `scoreAfter` on all pending interventions (those with scoreBefore but null scoreAfter).

- **Environment**: `.env.local` must contain `DATABASE_URL` with a Supabase **transaction pooler** connection string. Optional: `AI_COACHING_API_KEY` for AI coaching (placeholder responses if absent). This file is gitignored. `drizzle-kit` does not auto-load `.env.local` — the npm scripts use `dotenv-cli` to handle this.
