export interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
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

const MILESTONES: Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (ctx: MilestoneContext) => boolean;
}> = [
  {
    id: "first_log",
    name: "First Steps",
    description: "Submitted your first daily log",
    icon: "Pencil",
    check: (ctx) => ctx.totalLogs >= 1,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintained a 7-day streak",
    icon: "Flame",
    check: (ctx) => ctx.currentStreak >= 7,
  },
  {
    id: "streak_14",
    name: "Fortnight Force",
    description: "Maintained a 14-day streak",
    icon: "Flame",
    check: (ctx) => ctx.currentStreak >= 14,
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintained a 30-day streak",
    icon: "Flame",
    check: (ctx) => ctx.currentStreak >= 30,
  },
  {
    id: "first_exercise",
    name: "Getting Active",
    description: "Completed your first exercise",
    icon: "Dumbbell",
    check: (ctx) => ctx.exercisesCompleted >= 1,
  },
  {
    id: "exercises_10",
    name: "Exercise Enthusiast",
    description: "Completed 10 exercises",
    icon: "Trophy",
    check: (ctx) => ctx.exercisesCompleted >= 10,
  },
  {
    id: "partner_linked",
    name: "Better Together",
    description: "Linked with your partner",
    icon: "Heart",
    check: (ctx) => ctx.partnerLinked,
  },
  {
    id: "score_80",
    name: "High Achiever",
    description: "Reached a total quality score above 80",
    icon: "Star",
    check: (ctx) => (ctx.latestTotalQuality ?? 0) > 80,
  },
  {
    id: "score_90",
    name: "Elite Optimizer",
    description: "Reached a total quality score above 90",
    icon: "Crown",
    check: (ctx) => (ctx.latestTotalQuality ?? 0) > 90,
  },
  {
    id: "first_weekly",
    name: "Reflective Mind",
    description: "Completed your first weekly check-in",
    icon: "BookOpen",
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
      });
    }
  }

  return newMilestones;
}

export { MILESTONES };
