# User Feedback Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address 10 concrete UX problems reported by beta testers including radar chart readability, weight slider precision, notes visibility, back navigation, Android swipe-back crash, tab visibility, premium access for testers, and dimension definitions.

**Architecture:** Mostly targeted edits to existing client components and one server action. No new routes or DB migrations needed. The android back gesture fix requires editing `capacitor.config.ts`. Premium upgrade is a one-off DB script.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Recharts, shadcn/ui, Capacitor

**Axios security note:** Axios is NOT in this project at all — not as a direct or transitive dependency. No action needed.

---

### Task 1: Grant premium access to test account

**Files:**
- Create: `scripts/grant-premium.ts`

**Step 1: Write the script**

```typescript
// scripts/grant-premium.ts
import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const result = await sql`
    UPDATE users
    SET subscription_tier = 'premium', subscription_expires_at = NOW() + INTERVAL '1 year'
    WHERE email = 'admin@omnilife.app'
    RETURNING email, subscription_tier
  `;
  console.log("Updated:", result);
  await sql.end();
}

main().catch(console.error);
```

**Step 2: Run it**

```bash
npx tsx scripts/grant-premium.ts
```

Expected: `Updated: [ { email: 'admin@omnilife.app', subscription_tier: 'premium' } ]`

**Step 3: Commit**

```bash
git add scripts/grant-premium.ts
git commit -m "chore: add script to grant premium access for test accounts"
```

---

### Task 2: Fix radar chart readability — compare page

The `compare-client.tsx` radar uses `hsl(var(--muted-foreground))` for axis tick labels. On dark cards this blends into the background. Fix by using explicit high-contrast colors and increasing font size.

**Files:**
- Modify: `src/app/(dashboard)/compare/compare-client.tsx:326-335`

**Step 1: Open compare-client.tsx around line 326**

Find the `PolarAngleAxis` and `PolarRadiusAxis` blocks in the radar chart section (search for `PolarAngleAxis`).

**Step 2: Replace the radar chart axis config**

Old:
```tsx
<PolarAngleAxis
  dataKey="dimension"
  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
/>
<PolarRadiusAxis
  angle={90}
  domain={[0, 10]}
  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
/>
```

New:
```tsx
<PolarAngleAxis
  dataKey="dimension"
  tick={{ fill: "#e2e8f0", fontSize: 11, fontWeight: 500 }}
/>
<PolarRadiusAxis
  angle={90}
  domain={[0, 10]}
  tick={{ fill: "#94a3b8", fontSize: 10 }}
  tickCount={6}
/>
```

**Step 3: Verify visually** — `npm run dev`, go to `/compare` with partner data, confirm labels are readable.

**Step 4: Commit**

```bash
git add src/app/(dashboard)/compare/compare-client.tsx
git commit -m "fix: improve radar chart label contrast on compare page"
```

---

### Task 3: Add value dots with scores to radar chart (both InteractiveRadar and compare)

Users asked "what score is fairness — 4 or 6?" — add a custom dot that shows the value on hover/tap.

**Files:**
- Modify: `src/app/(dashboard)/compare/compare-client.tsx` (add Tooltip to the radar)

**Step 1: The compare radar already renders without a Tooltip. Add one.**

In `compare-client.tsx`, in the `RadarChart` block (around line 325), add after the two `<Radar>` components:

```tsx
<Tooltip
  formatter={(value: number, name: string) => [value.toFixed(1), name]}
  contentStyle={{
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  }}
/>
```

**Step 2: Verify** — tap/hover a radar point on compare page, popup shows value.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/compare/compare-client.tsx
git commit -m "feat: add tooltip to compare radar chart showing score values"
```

---

### Task 4: Add dimension definitions — tap any row in gap analysis table

Users want to tap a row and see what "Fairness" or "Vitality" actually means.

**Files:**
- Modify: `src/app/(dashboard)/compare/compare-client.tsx`

**Step 1: Add DIMENSION_DEFS constant at top of file (after DIMENSIONS array)**

```typescript
const DIMENSION_DEFS: Record<string, string> = {
  vitalityScore: "How physically energized and healthy you feel — sleep, exercise, nutrition.",
  growthScore: "Your sense of learning, progress, and personal development.",
  securityScore: "Stability in finances, career, housing, and the future.",
  connectionScore: "Depth of emotional bond and quality time with your partner.",
  emotionalScore: "How supported, heard, and emotionally safe you feel.",
  trustScore: "Reliability, honesty, and confidence in each other.",
  fairnessScore: "Whether responsibilities, effort, and resources feel equally shared.",
  stressScore: "How well you are each managing stress (higher = less stressed).",
  autonomyScore: "Your sense of personal space, independence, and identity within the relationship.",
};
```

**Step 2: Add state for selected dimension**

At the top of `CompareClient` component, add:
```typescript
const [selectedDim, setSelectedDim] = useState<string | null>(null);
```

**Step 3: Make table rows tappable — show definition below the row**

In the `<tbody>` map, wrap the first `<td>` dimension label to be clickable:

Replace the existing first `<td>` in the table:
```tsx
<td className="py-2.5 pr-4">
  <div className="flex items-center gap-2">
    {row.label}
    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
      {row.category === "life" ? "Life" : "Rel"}
    </Badge>
  </div>
</td>
```

With:
```tsx
<td className="py-2.5 pr-4" colSpan={selectedDim === row.dim ? 5 : undefined}>
  <button
    className="flex items-center gap-2 text-left w-full"
    onClick={() => setSelectedDim(selectedDim === row.dim ? null : row.dim)}
  >
    <span className="font-medium">{row.label}</span>
    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
      {row.category === "life" ? "Life" : "Rel"}
    </Badge>
  </button>
  {selectedDim === row.dim && (
    <p className="mt-1 text-xs text-muted-foreground">
      {DIMENSION_DEFS[row.dim]}
    </p>
  )}
</td>
```

Note: When `colSpan={5}` is set on the first td, the other tds still render — that's fine since the definition just appears below the label inline. Actually, keep it simple: just show the definition below the label text, no colSpan needed. Remove `colSpan` from the solution above.

**Step 4: Commit**

```bash
git add src/app/(dashboard)/compare/compare-client.tsx
git commit -m "feat: tap dimension label in gap analysis to see definition"
```

---

### Task 5: Weight sliders — add number input, reset button, and explanation

**Files:**
- Modify: `src/components/forms/WeightSliders.tsx`
- Modify: `src/app/(dashboard)/settings/settings-client.tsx`

**Step 1: Add number inputs alongside sliders in WeightSliders.tsx**

For each slider group (alpha/beta, pillar, rel), add a number input that shows the current value and lets the user type a precise number.

In `WeightSliders.tsx`, import `Input` at top:
```typescript
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
```

**Step 2: Add reset handlers**

After the existing `handleRelChange`, add:
```typescript
const handleResetPillars = useCallback(() => {
  const equal = 0.25;
  onChange({
    ...weights,
    pillar: { vitality: equal, growth: equal, security: equal, connection: equal },
  });
}, [weights, onChange]);

const handleResetRel = useCallback(() => {
  const equal = 0.2;
  onChange({
    ...weights,
    rel: { emotional: equal, trust: equal, fairness: equal, stress: equal, autonomy: equal },
  });
}, [weights, onChange]);
```

**Step 3: Add number input beside each pillar slider**

Replace the pillar key mapping block in `CardContent` so each row looks like:
```tsx
<div key={key}>
  <div className="flex items-center justify-between mb-1">
    <span className="text-sm text-muted-foreground">{PILLAR_LABELS[key]}</span>
    <input
      type="number"
      min={0}
      max={100}
      step={1}
      value={Math.round(weights.pillar[key] * 100)}
      onChange={(e) => handlePillarChange(key, [Number(e.target.value)])}
      className="w-14 rounded border bg-background px-2 py-0.5 text-right font-mono text-sm"
    />
  </div>
  <div style={{ touchAction: "none" }}>
    <Slider
      value={[Math.round(weights.pillar[key] * 100)]}
      onValueChange={(v) => handlePillarChange(key, v)}
      min={0}
      max={100}
      step={1}
    />
  </div>
</div>
```

**Step 4: Add Reset button to each card header**

In the "Life Pillar Weights" `CardHeader`, change `CardTitle` to flex with reset button:
```tsx
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle>Life Pillar Weights</CardTitle>
    <Button variant="ghost" size="sm" onClick={handleResetPillars} className="h-7 gap-1 text-xs">
      <RotateCcw className="h-3 w-3" />
      Reset equal
    </Button>
  </div>
</CardHeader>
```

Do the same for rel weights, using `handleResetRel`.

**Step 5: Add explanation text in settings-client.tsx weights tab**

In `settings-client.tsx`, in the `TabsContent value="weights"` section, add this explanation block BEFORE the `<WeightSliders>` component:

```tsx
<div className="rounded-lg border border-border/40 bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
  <p className="font-medium text-foreground">What do weights do?</p>
  <p>
    Your Overall Score is a <strong>weighted average</strong> of your Life Score and Relationship Score.
    Within each, individual dimensions (Vitality, Trust, etc.) contribute according to their weights.
  </p>
  <p>
    <strong>Example:</strong> If Sleep and Energy matter most to you right now, increase Vitality weight.
    If trust issues are your focus, increase Trust weight. The app will rank those dimensions higher in
    your score and when suggesting exercises.
  </p>
  <p>
    Weights auto-sum to 1.0 — adjusting one dimension redistributes the rest proportionally.
  </p>
</div>
```

**Step 6: Commit**

```bash
git add src/components/forms/WeightSliders.tsx src/app/(dashboard)/settings/settings-client.tsx
git commit -m "feat: weight sliders — add number inputs, reset buttons, and explanation"
```

---

### Task 6: Show notes in the overview / recent log

Users log notes but can't find them afterward.

**Files:**
- Modify: `src/app/(dashboard)/overview/page.tsx` — pass `latestLog.notes` to client
- Modify: `src/app/(dashboard)/overview/dashboard-client.tsx` — display notes card

**Step 1: Pass notes to DashboardClient in page.tsx**

In `page.tsx`, find where `DashboardClient` is rendered. Add `latestNotes={latestLog?.notes ?? null}` to the props (check the exact prop passing around line 60-100 in that file).

**Step 2: In dashboard-client.tsx, add `latestNotes` prop**

In the `DashboardClientProps` interface, add:
```typescript
latestNotes?: string | null;
```

**Step 3: Render notes card**

After the radar chart card (look for `<InteractiveRadar` usage), add:
```tsx
{latestNotes && (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Today&apos;s Note
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm">{latestNotes}</p>
    </CardContent>
  </Card>
)}
```

**Step 4: Commit**

```bash
git add src/app/(dashboard)/overview/page.tsx src/app/(dashboard)/overview/dashboard-client.tsx
git commit -m "feat: show today's note from daily log on overview dashboard"
```

---

### Task 7: Fix tabs not readable in compare page (premium gate)

The Trend Comparison tabs ("Overall Score / Life Score / Rel Score") are inside `PremiumGate` and blurred for free users. The fix is to move the tab switcher outside the gate so users can see what the tabs say but the chart content is gated.

**Files:**
- Modify: `src/app/(dashboard)/compare/compare-client.tsx`

**Step 1: Move trendMetric state and tabs outside PremiumGate**

Currently the `<Tabs value={trendMetric} ...>` block is inside `<PremiumGate>`.

Move the `<TabsList>` with the three triggers OUTSIDE the `PremiumGate`, and keep only the `<TabsContent>` (chart content) inside. Since recharts `Tabs` is used differently here (just for the switcher, not actual TabsContent), restructure it:

Replace the current structure:
```tsx
<PremiumGate userTier={userTier} feature="insights">
  <Card>
    <CardHeader>...</CardHeader>
    <CardContent>
      <Tabs value={trendMetric} onValueChange={...}>
        <TabsList>
          <TabsTrigger value="totalQuality">Overall Score</TabsTrigger>
          <TabsTrigger value="lifeScore">Life Score</TabsTrigger>
          <TabsTrigger value="relScore">Rel Score</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-4 h-64">... chart ...</div>
    </CardContent>
  </Card>
</PremiumGate>
```

With:
```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="text-base">Trend Comparison</CardTitle>
      <Tabs value={trendMetric} onValueChange={(v) => setTrendMetric(v as typeof trendMetric)}>
        <TabsList>
          <TabsTrigger value="totalQuality">Overall</TabsTrigger>
          <TabsTrigger value="lifeScore">Life</TabsTrigger>
          <TabsTrigger value="relScore">Rel</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  </CardHeader>
  <CardContent>
    <PremiumGate userTier={userTier} feature="insights">
      <div className="h-64">... chart ...</div>
    </PremiumGate>
  </CardContent>
</Card>
```

**Step 2: Verify** — free user can see and click tabs but chart is blurred/gated.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/compare/compare-client.tsx
git commit -m "fix: show trend chart tab labels to all users, gate only the chart content"
```

---

### Task 8: Add back button to pages

Users reported no back button on pages like exercises, weekly check-in.

**Files:**
- Modify: `src/components/back-button.tsx` — this already exists for public pages
- Modify: Key dashboard pages that lack back navigation

**Step 1: Read back-button.tsx**

```bash
cat src/components/back-button.tsx
```

It uses `router.back()`. This component already exists for public pages.

**Step 2: Add back button to the daily log page**

In `src/app/(dashboard)/daily/page.tsx`, check if it has a back button. If not, import and add `<BackButton />` at the top of the page content.

**Step 3: Add back button to compare, weekly, exercises pages**

Check these pages for a header/title area and add `<BackButton />` where missing:
- `src/app/(dashboard)/compare/page.tsx`
- `src/app/(dashboard)/weekly/page.tsx`
- `src/app/(dashboard)/exercises/page.tsx` (if exists)

Pattern for each page:
```tsx
import { BackButton } from "@/components/back-button";

// In the page JSX, at the top:
<div className="flex items-center gap-3 mb-4">
  <BackButton />
  <h1 className="text-xl font-bold">Page Title</h1>
</div>
```

**Step 4: Commit**

```bash
git add src/app/(dashboard)/*/page.tsx src/components/back-button.tsx
git commit -m "feat: add back button to dashboard pages for easier navigation"
```

---

### Task 9: Fix Android swipe-right exiting the app (Capacitor)

When users swipe right (back gesture) on Android, Capacitor exits the app instead of going back in the WebView history.

**Files:**
- Modify: `capacitor.config.ts`
- Create: `src/lib/capacitor/back-handler.ts`

**Step 1: Read capacitor.config.ts**

```bash
cat capacitor.config.ts
```

**Step 2: Disable native back gesture and handle it in JS**

In `capacitor.config.ts`, add to the `android` config section:
```typescript
android: {
  // ... existing config
  handleApplicationNotifications: false,
}
```

Note: The real fix is handling the App plugin's `backButton` event. Create a handler:

**Step 3: Create back-handler.ts**

```typescript
// src/lib/capacitor/back-handler.ts
import { App } from "@capacitor/app";

let initialized = false;

export function initAndroidBackHandler() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      // On root page, minimize the app instead of exiting
      App.minimizeApp();
    }
  });
}
```

**Step 4: Initialize in root layout or a client component**

In `src/app/layout.tsx` or a `CapacitorInit` client component, call `initAndroidBackHandler()` in a `useEffect`. Since `app/layout.tsx` is a Server Component, create a tiny client component:

```tsx
// src/components/capacitor-init.tsx
"use client";
import { useEffect } from "react";
import { initAndroidBackHandler } from "@/lib/capacitor/back-handler";

export function CapacitorInit() {
  useEffect(() => {
    initAndroidBackHandler();
  }, []);
  return null;
}
```

Add `<CapacitorInit />` inside `src/app/layout.tsx`'s `<body>`.

**Step 5: Verify** — after `npm run cap:sync` and deploying to Android, swipe right goes back in history instead of exiting. On the root screen, swipe right minimizes the app.

**Step 6: Commit**

```bash
git add src/lib/capacitor/back-handler.ts src/components/capacitor-init.tsx src/app/layout.tsx
git commit -m "fix: handle Android back gesture — navigate history instead of exiting app"
```

---

### Task 10: Add link to weight settings from overview and exercises

Users asked how to maximize the app for multi-objective optimization — they should see a hint pointing to Settings > Weights.

**Files:**
- Modify: `src/app/(dashboard)/overview/dashboard-client.tsx`

**Step 1: Add a small hint near the radar chart**

After the radar chart card, add (only if user has at least one log):
```tsx
<p className="text-center text-xs text-muted-foreground">
  Customize how dimensions are weighted in{" "}
  <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">
    Settings → Weights
  </Link>
</p>
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/overview/dashboard-client.tsx
git commit -m "feat: add settings weights hint below overview radar chart"
```

---

## Summary of Issues NOT Fixed Here (need investigation)

- **"Upper menu bar does not show up quickly"** — likely a Capacitor WebView cold-start rendering delay, not a code bug. Investigate with Chrome DevTools remote debugging on device. Possible fix: add a splash screen with `@capacitor/splash-screen` to mask cold start.

- **"Session not persistent / keeps logging me out"** — requires live debugging. Cookie is set for 7 days. Possible causes: (a) Capacitor WebView cookie isolation — see CLAUDE.md `Android WebView cookie persistence` section for the `MainActivity.java` fix that may not be applied; (b) HTTPS-only cookies failing on the WebView. Check that `CookieManager.flush()` is called in `onStop`.

- **"Also to even change dimensions (fairness not an issue)"** — disabling/hiding a dimension requires scoring engine changes (skip dimension in weighted average when weight is 0). Complex — treat as a separate feature.
