export interface Features {
  dailyLog: boolean;
  basicScores: boolean;
  /** Exercises per rolling 7 days (Infinity = unlimited) */
  exerciseLimit: number;
  historyDays: number;
  /** Days of partner comparison history */
  compareDays: number;
  insights: boolean;
  weeklyCheckin: boolean;
  scenarios: boolean;
  constraints: boolean;
  partnerLinking: boolean;
  exportReports: boolean;
  aiCoaching: boolean;
  /** AI coaching messages per UTC day (0 = no access) */
  aiDailyMessageQuota: number;
  therapistExport: boolean;
}

export const TIERS = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    featureList: [
      "Daily check-in & scores",
      "Streaks",
      "7-day history",
      "5 exercises per week",
      "Partner linking",
    ],
    features: {
      dailyLog: true,
      basicScores: true,
      exerciseLimit: 5,
      historyDays: 7,
      compareDays: 7,
      insights: false,
      weeklyCheckin: true,
      scenarios: false,
      constraints: false,
      partnerLinking: true,
      exportReports: false,
      aiCoaching: false,
      aiDailyMessageQuota: 0,
      therapistExport: false,
    } satisfies Features,
  },
  /** Legacy tier: readable for existing subscribers, no longer sold. */
  pro: {
    name: "Pro",
    monthlyPrice: 3.99,
    yearlyPrice: 29.99,
    featureList: [
      "Everything in Free",
      "Unlimited history",
      "Unlimited scenarios",
      "Advanced insights & trends",
      "Partner comparison dashboard",
      "Full exercise library (37)",
      "Limits & boundaries",
      "Data export",
    ],
    features: {
      dailyLog: true,
      basicScores: true,
      exerciseLimit: Infinity,
      historyDays: Infinity,
      compareDays: 30,
      insights: true,
      weeklyCheckin: true,
      scenarios: true,
      constraints: true,
      partnerLinking: true,
      exportReports: true,
      aiCoaching: false,
      aiDailyMessageQuota: 0,
      therapistExport: false,
    } satisfies Features,
  },
  premium: {
    // Repriced 2026-10-25, before the first paying subscriber: Play price-locks
    // existing subscribers, so this was the last free moment to change it. The
    // category median is $12.99/mo and ~$49.99/yr (Paired charges $79.99/yr for
    // the same both-partners plan), so this is still the value option. These
    // figures are the WEB/Stripe prices and the marketing copy only -- native
    // prices always come from the store offering, never from here.
    name: "Premium",
    monthlyPrice: 7.99,
    yearlyPrice: 39.99,
    featureList: [
      "Covers both partners",
      "90-day history & trends",
      "Optimizer & Pareto insights",
      "Full exercise library",
      "Partner divergence breakdown (30 days)",
      "Scenarios & boundaries",
      "AI coaching (30 messages/day)",
      "Export & therapist reports",
    ],
    features: {
      dailyLog: true,
      basicScores: true,
      exerciseLimit: Infinity,
      historyDays: 90,
      compareDays: 30,
      insights: true,
      weeklyCheckin: true,
      scenarios: true,
      constraints: true,
      partnerLinking: true,
      exportReports: true,
      aiCoaching: true,
      aiDailyMessageQuota: 30,
      therapistExport: true,
    } satisfies Features,
  },
} as const;

export type SubscriptionTier = keyof typeof TIERS;
export type TierKey = SubscriptionTier;

/** Tiers that can be purchased by new users. `pro` is legacy-only. */
export const SELLABLE_TIERS = ["premium"] as const;
export type SellableTier = (typeof SELLABLE_TIERS)[number];

export const FEATURE_LABELS: Record<keyof Features, string> = {
  dailyLog: "Daily Logging",
  basicScores: "Score Tracking",
  exerciseLimit: "Exercises",
  historyDays: "History",
  compareDays: "Partner Comparison History",
  insights: "Advanced Insights",
  weeklyCheckin: "Weekly Check-in",
  scenarios: "Scenario Modes",
  constraints: "Limits & Boundaries",
  partnerLinking: "Partner Linking",
  exportReports: "Export Reports",
  aiCoaching: "AI Coaching",
  aiDailyMessageQuota: "AI Coaching Messages",
  therapistExport: "Therapist Export",
};

export const FEATURE_DESCRIPTIONS: Record<keyof Features, string> = {
  dailyLog: "Log your relationship dimensions daily",
  basicScores: "Track Life Score, Relationship Score, and Overall Score",
  exerciseLimit: "Access psychology-grounded exercises",
  historyDays: "View your score history and trends",
  compareDays: "Compare scores with your partner over time",
  insights: "Balance analysis and advanced trends",
  weeklyCheckin: "Weekly reflection and goal setting",
  scenarios: "Switch between life scenario modes",
  constraints: "Set limits and boundaries for your scores",
  partnerLinking: "Link with your partner's account",
  exportReports: "Export monthly PDF reports",
  aiCoaching: "Get personalized AI coaching insights",
  aiDailyMessageQuota: "Daily AI coaching message allowance",
  therapistExport: "Generate detailed reports for your therapist",
};
