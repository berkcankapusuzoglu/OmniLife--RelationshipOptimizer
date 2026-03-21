export interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  percentile?: string;
}

export interface MilestoneContext {
  currentStreak: number;
  longestStreak: number;
  totalLogs: number;
  exercisesCompleted: number;
  partnerLinked: boolean;
  latestTotalQuality: number | null;
  weeklyCheckinsCount: number;
  /** Previously achieved milestone IDs (stored client-side or in DB) */
  achieved: Set<string>;
}

/** Percentile data for each milestone — used in celebration modals and share cards */
export const MILESTONE_PERCENTILES: Record<string, string> = {
  first_log: "100% of couples start here",
  streak_7: "Only 23% reach a 7-day streak",
  streak_14: "Only 11% maintain 14 days",
  streak_30: "Only 4% make it to 30 days — you're extraordinary",
  first_exercise: "68% of users try their first exercise",
  exercises_10: "Only 29% complete 10 exercises",
  partner_linked: "42% of users link with a partner",
  score_80: "Top 18% of couples",
  score_90: "Top 5% — relationship elite",
  first_weekly: "54% of users complete a weekly check-in",
};

const MILESTONES: Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  percentile: string;
  check: (ctx: MilestoneContext) => boolean;
}> = [
  {
    id: "first_log",
    name: "First Steps",
    description: "Submitted your first daily log",
    icon: "Pencil",
    percentile: MILESTONE_PERCENTILES.first_log,
    check: (ctx) => ctx.totalLogs >= 1,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintained a 7-day streak",
    icon: "Flame",
    percentile: MILESTONE_PERCENTILES.streak_7,
    check: (ctx) => ctx.currentStreak >= 7,
  },
  {
    id: "streak_14",
    name: "Fortnight Force",
    description: "Maintained a 14-day streak",
    icon: "Flame",
    percentile: MILESTONE_PERCENTILES.streak_14,
    check: (ctx) => ctx.currentStreak >= 14,
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintained a 30-day streak",
    icon: "Flame",
    percentile: MILESTONE_PERCENTILES.streak_30,
    check: (ctx) => ctx.currentStreak >= 30,
  },
  {
    id: "first_exercise",
    name: "Getting Active",
    description: "Completed your first exercise",
    icon: "Dumbbell",
    percentile: MILESTONE_PERCENTILES.first_exercise,
    check: (ctx) => ctx.exercisesCompleted >= 1,
  },
  {
    id: "exercises_10",
    name: "Exercise Enthusiast",
    description: "Completed 10 exercises",
    icon: "Trophy",
    percentile: MILESTONE_PERCENTILES.exercises_10,
    check: (ctx) => ctx.exercisesCompleted >= 10,
  },
  {
    id: "partner_linked",
    name: "Better Together",
    description: "Linked with your partner",
    icon: "Heart",
    percentile: MILESTONE_PERCENTILES.partner_linked,
    check: (ctx) => ctx.partnerLinked,
  },
  {
    id: "score_80",
    name: "High Achiever",
    description: "Reached a total quality score above 80",
    icon: "Star",
    percentile: MILESTONE_PERCENTILES.score_80,
    check: (ctx) => (ctx.latestTotalQuality ?? 0) > 80,
  },
  {
    id: "score_90",
    name: "Elite Optimizer",
    description: "Reached a total quality score above 90",
    icon: "Crown",
    percentile: MILESTONE_PERCENTILES.score_90,
    check: (ctx) => (ctx.latestTotalQuality ?? 0) > 90,
  },
  {
    id: "first_weekly",
    name: "Reflective Mind",
    description: "Completed your first weekly check-in",
    icon: "BookOpen",
    percentile: MILESTONE_PERCENTILES.first_weekly,
    check: (ctx) => ctx.weeklyCheckinsCount >= 1,
  },
];

/**
 * Check which milestones are newly achieved given the current context.
 * Returns only milestones that weren't previously in the `achieved` set.
 */
export function checkMilestones(context: MilestoneContext): Milestone[] {
  const newMilestones: Milestone[] = [];

  for (const m of MILESTONES) {
    if (context.achieved.has(m.id)) continue;
    if (m.check(context)) {
      newMilestones.push({
        id: m.id,
        name: m.name,
        description: m.description,
        icon: m.icon,
        percentile: m.percentile,
      });
    }
  }

  return newMilestones;
}

export { MILESTONES };
