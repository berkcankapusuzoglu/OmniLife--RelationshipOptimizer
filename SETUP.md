# Setup Guide — What Was Done & How to Reproduce

This document explains every step taken to go from an empty repo to a fully working app.

---

## 1. Scaffolded the Next.js Project

```bash
npx create-next-app@latest . --yes --force --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-npm
```

**Why `--force`?** The directory already had files (CLAUDE.md, .git). Without `--force`, create-next-app refuses to run.

**Why `--yes`?** Skips interactive prompts that hang in non-interactive shells.

---

## 2. Installed Dependencies

```bash
# ORM + database driver
npm install drizzle-orm postgres

# Auth
npm install bcryptjs zod
npm install -D @types/bcryptjs

# UI components
npx shadcn@latest init -d
npx shadcn@latest add button card input label textarea select switch tabs dialog alert-dialog sheet dropdown-menu badge separator skeleton slider table scroll-area checkbox tooltip popover progress avatar command

# Charts
npm install recharts

# Utilities
npm install uuid
npm install -D @types/uuid dotenv-cli drizzle-kit
```

### What each does:
- **drizzle-orm** — type-safe SQL ORM (like Prisma but lighter)
- **postgres** — PostgreSQL driver for Node.js
- **bcryptjs** — password hashing (used in auth)
- **zod** — input validation for forms
- **shadcn/ui** — copy-paste component library (Button, Card, Dialog, etc.)
- **recharts** — React charting (radar, scatter, line charts)
- **uuid** — generate unique IDs for database records
- **dotenv-cli** — loads .env.local for scripts that don't auto-load it (like drizzle-kit)
- **drizzle-kit** — CLI tool for pushing schema to database

---

## 3. Created the Supabase Database

### Steps in the Supabase Dashboard:

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your organization
3. Click **New Project**
4. Fill in:
   - **Project name**: OmniLife
   - **Database password**: click "Generate a password" (save this!)
   - **Region**: East US (North Virginia) — pick closest to your users
5. Click **Create new project**
6. Wait for status to show "Healthy"

### Get the Connection String:

1. Click **Connect** button (top right of project dashboard)
2. Select **Transaction pooler** method (required for serverless/Next.js)
3. Copy the URI — it looks like:
   ```
   postgresql://postgres.PROJECTID:YOUR-PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with the password from step 4

### Why Transaction Pooler?

Next.js runs in serverless functions. Each request opens a new connection. Without pooling, you'd exhaust the database connection limit instantly. The transaction pooler shares connections across requests.

---

## 4. Created .env.local

```bash
# Create the file (NEVER commit this)
echo "DATABASE_URL=postgresql://postgres.PROJECTID:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres" > .env.local
```

This file is in `.gitignore` (the `*.env*` pattern catches it). The `.env.example` file shows the format without real credentials.

---

## 5. Pushed the Schema to the Database

```bash
npm run db:push
```

This runs `dotenv -e .env.local -- drizzle-kit push` which:
1. Loads DATABASE_URL from .env.local (drizzle-kit doesn't auto-load it like Next.js does)
2. Reads the schema from `src/lib/db/schema.ts`
3. Creates all tables, enums, and indexes in your Supabase database

### What got created:

| Table | Purpose |
|---|---|
| `users` | Accounts, passwords, weight preferences |
| `daily_logs` | Daily ratings for 9 dimensions + mood + energy |
| `weekly_checkins` | Weekly reflection data (4-step wizard) |
| `scores` | Computed Life Score, Rel Score, Total Quality per day |
| `tasks` | Household tasks with effort points and status |
| `constraints` | Redlines, time budgets, energy budgets |
| `scenario_profiles` | Custom + preset optimization scenarios |
| `interventions` | Completed exercises and their ratings |

3 enums: `task_status` (pending/in_progress/done), `constraint_type`, `scenario_mode`.

---

## 6. Fixed the Server/Client Component Boundary

### The Problem

Next.js 16 Server Components can't pass React components (like Lucide icons) to Client Components as props. You get:

```
Only plain objects can be passed to Client Components from Server Components.
Classes or other objects with methods are not supported.
```

### The Fix

Moved the `navItems` array (which contains Lucide icon components) from the Server Component (`layout.tsx`) into the Client Components (`SidebarNav.tsx`, `MobileNav.tsx`). The layout now renders `<SidebarNav />` and `<MobileNav />` with no props — the nav items live inside the client components where icon components are allowed.

### Rule of Thumb

Never pass anything with methods (React components, class instances, functions) from Server Components to Client Components. Only pass plain data: strings, numbers, booleans, arrays, plain objects.

---

## 7. Fixed shadcn/ui Base UI Patterns

This project uses **shadcn/ui with Base UI** (not Radix). Key difference:

```tsx
// Radix style (WRONG for this project)
<Button asChild>
  <Link href="/daily">Log Today</Link>
</Button>

// Base UI style (CORRECT for this project)
<Button render={<Link href="/daily" />}>
  Log Today
</Button>
```

The `render` prop replaces `asChild`. This applies to Button, SheetTrigger, DialogTrigger, and any component that needs to render as a different element.

---

## 8. Database Connection Pattern

```typescript
// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const client = postgres(process.env.DATABASE_URL!);
  return drizzle(client, { schema });
}

export function getDb() {
  if (!db) {
    db = createDb();
  }
  return db;
}
```

### Why lazy initialization?

During `next build`, Next.js evaluates module code at build time. If the database client is created at the top level, it crashes because `DATABASE_URL` isn't set during build. The `getDb()` function delays creation until the first actual database call at runtime.

---

## 9. Auth System

Simple cookie-based auth — no external provider needed:

1. **Register**: hash password with bcrypt, insert into `users` table
2. **Login**: find user by email, compare password hash, set cookie
3. **Session**: base64-encoded JSON in an HTTP-only cookie (7-day expiry)
4. **Guard**: `requireAuth()` reads the cookie, redirects to `/login` if missing

The cookie stores `{ userId, email }`. On each request, the guard fetches the full user from the database.

---

## 10. Scoring Engine

All pure TypeScript functions in `src/lib/engine/`:

- **scoring.ts** — computes Life Score, Rel Score, Total Quality
- **penalties.ts** — redline violations, imbalance penalties, budget overruns
- **constraints.ts** — checks all active constraints against current scores
- **optimizer.ts** — Nelder-Mead simplex optimizer for finding optimal allocations
- **pareto.ts** — detects Pareto frontier from historical (lifeScore, relScore) pairs

Scores are computed server-side when a daily log is submitted, then stored in the `scores` table.

---

## Useful Commands

```bash
# Start dev server
npm run dev

# Push schema changes to database
npm run db:push

# Open Drizzle Studio (visual database browser)
npm run db:studio

# Build for production
npm run build
```

---

## File Structure Cheat Sheet

```
.env.local          <- YOUR database credentials (never commit)
.env.example        <- template showing what's needed
drizzle.config.ts   <- tells drizzle-kit where the schema is
src/lib/db/schema.ts <- all database tables defined here
src/lib/db/index.ts  <- database connection singleton
src/lib/auth/        <- login, register, session, guards
src/lib/engine/      <- scoring math, penalties, optimizer
src/app/(auth)/      <- login + register pages
src/app/(dashboard)/ <- all app pages behind auth
```
