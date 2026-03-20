# OmniLife — Relationship Optimizer

A decision-support web app that models your life and relationship as a multi-objective optimization problem. Track 9 dimensions daily, get scored feedback, set constraints, run exercises, and see where you stand on the Pareto frontier.

---

## Quick Start

```bash
# Install dependencies
npm install

# Create .env.local with your Supabase connection string
echo "DATABASE_URL=postgresql://..." > .env.local

# Push schema to database
npx dotenv -e .env.local -- npx drizzle-kit push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

---

## How to Use

### 1. Create an Account

Go to `/register`. Enter an email and password. You're in.

### 2. Daily Log (do this every day, takes < 2 min)

**Sidebar > Daily Log**

Rate yourself on 9 dimensions using sliders (0–10):

| Life Pillars | Relationship Dimensions |
|---|---|
| Vitality (sleep, exercise, health) | Emotional (closeness, warmth) |
| Growth (learning, career, goals) | Trust (reliability, honesty) |
| Security (finances, stability) | Fairness (equal effort, balance) |
| Connection (social, community) | Stress Management (conflict handling) |
| | Autonomy (personal space, independence) |

Then pick your **mood** (awful → great) and **energy level** (1–5).

Hit **Log Today**. Your scores update on the dashboard immediately.

### 3. Dashboard

**Sidebar > Dashboard**

Shows three scores at a glance:

- **Life Score** (0–100) — weighted average of your 4 life pillars
- **Relationship Score** (0–100) — weighted average of your 5 relationship dimensions
- **Total Quality** (0–100) — combined score minus any penalties

Quick action buttons take you to Daily Log, Exercises, Weekly Check-in, and Scenarios.

### 4. Weekly Check-in (do this once a week)

**Sidebar > Weekly Check-in**

A 4-step wizard:

1. **Satisfaction ratings** — rate all 9 dimensions for the week
2. **Wins & highlights** — what went well this week
3. **Challenges** — what was hard, which dimension it affected, how severe
4. **Goals** — set intentions for next week

### 5. Tasks

**Sidebar > Tasks**

A Kanban board for household/shared responsibilities:

- Click **Add Task** — give it a title, description, and effort points (1–5)
- Tasks start in **Pending**
- Drag to **In Progress** then **Done** as you complete them
- Effort points track fairness between partners

### 6. Exercises

**Sidebar > Exercises**

Curated connection exercises backed by psychology research:

- Each exercise shows its **target dimension**, **duration**, **difficulty**, and **theory basis**
- Examples: "Vulnerability Practice" (Attachment Theory), "Conflict Repair Ritual" (Gottman)
- Click **Start Exercise** to begin
- Rate it when you're done

The system recommends exercises based on your lowest-scoring dimensions.

### 7. Constraints

**Sidebar > Constraints**

Set hard limits to protect your well-being:

- **Redline** — minimum floor for any dimension (e.g., "Vitality must never drop below 3")
- **Time Budget** — max hours per day on a category
- **Energy Budget** — max energy allocated to an area

Click **Add Constraint**, pick a type, dimension, and value. Toggle constraints on/off with the switch. If you log scores below a redline, a penalty gets applied to your Total Quality score.

### 8. Scenarios

**Sidebar > Scenarios**

Switch your optimization profile based on your current life situation:

| Scenario | What it does |
|---|---|
| **Default** | Equal weights across everything |
| **Exam Season** | Prioritizes Growth + Autonomy, relaxes Connection |
| **Chill Mode** | Prioritizes Vitality + Connection, relaxes Security |
| **Newborn** | Security first, minimal Growth expectations |
| **Crisis Mode** | Emotional well-being is top priority, strict stress tracking |
| **Long Distance** | Trust + Emotional highest, Fairness deprioritized |

Click **Preview** to see how scores would change. Click **Activate** to switch.

### 9. Partner

**Sidebar > Partner**

Link accounts with your partner:

1. Click **Generate Code** to get a 6-digit invite code
2. Share it with your partner
3. They enter it in their **Enter Partner's Code** field and click **Link Partner**
4. Once linked, you share tasks and can see each other's radar charts

### 10. Insights

**Sidebar > Insights**

Three tabs:

- **Recommendations** — personalized suggestions based on your scores (e.g., "Your emotional score is declining — try a Vulnerability Practice exercise")
- **Pareto Frontier** — scatter plot showing your Life Score vs Relationship Score over time, with the optimal frontier highlighted
- **Trends** — line charts showing how each dimension changes day to day

Need at least a few days of logs before insights become useful.

### 11. Settings

**Sidebar > Settings**

Three tabs:

- **Profile** — update your name, sign out
- **Weights** — fine-tune how much each dimension matters to you:
  - Life/Relationship balance slider (alpha vs beta)
  - 4 Life Pillar weight sliders (auto-normalize to sum = 1)
  - 5 Relationship Dimension weight sliders (auto-normalize to sum = 1)
- **Data** — export your data as JSON

---

## How Scoring Works

```
Life Score    = (w_vitality * vitality + w_growth * growth + w_security * security + w_connection * connection) * 10
Rel Score     = (w_emotional * emotional + w_trust * trust + w_fairness * fairness + w_stress * stress + w_autonomy * autonomy) * 10
Total Quality = alpha * Life Score + beta * Rel Score - Penalties

Penalties:
  Redline    = 5 * (redline - actual)^2    when dimension < redline
  Imbalance  = 2 * variance(pillar scores) penalizes extreme specialization
  Budget     = linear penalty for overshoot
```

All scores range 0–100. Weights are normalized so they always sum to 1.

---

## Tech Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (dark mode)
- **Recharts** (radar, scatter, line charts)
- **Drizzle ORM** + **PostgreSQL** (Supabase)
- **Geist** font family

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login + Register pages
│   ├── (dashboard)/     # All app pages (daily, weekly, tasks, etc.)
│   └── layout.tsx       # Root layout with fonts + dark mode
├── components/
│   ├── charts/          # InteractiveRadar, ParetoChart, TrendCharts
│   ├── forms/           # DailyLogForm, WeeklyCheckinWizard, WeightSliders
│   ├── nav/             # SidebarNav, MobileNav
│   ├── tasks/           # TaskBoard, FairnessGauge
│   └── ui/              # shadcn/ui primitives
├── lib/
│   ├── auth/            # Session cookies, login/register actions, guards
│   ├── db/              # Drizzle schema + connection
│   ├── engine/          # Scoring, penalties, constraints, optimizer, pareto
│   ├── recommendations/ # Rules, exercises, psychology theories
│   └── scenarios/       # 6 preset scenario profiles
└── hooks/               # useRadarDrag
```
