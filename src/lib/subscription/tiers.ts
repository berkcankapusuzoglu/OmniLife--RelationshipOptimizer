export interface Features {
  dailyLog: boolean;
  basicScores: boolean;
  exerciseLimit: number;
  historyDays: number;
  insights: boolean;
  weeklyCheckin: boolean;
  scenarios: boolean;
  constraints: boolean;
  partnerLinking: boolean;
  exportReports: boolean;
}

export const TIERS = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    featureList: [
      "Daily logging",
      "Basic scoring engine",
      "7-day history",
      "5 exercises",
      "1 scenario profile",
      "Partner linking",
    ],
    features: {
      dailyLog: true,
      basicScores: true,
      exerciseLimit: 5,
      historyDays: 7,
      insights: false,
      weeklyCheckin: true,
      scenarios: false,
      constraints: false,
      partnerLinking: true,
      exportReports: false,
    } satisfies Features,
  },
  premium: {
    name: "Premium",
    monthlyPrice: 7.99,
    yearlyPrice: 59.99,
    featureList: [
      "Everything in Free",
      "Unlimited history",
      "Unlimited scenarios",
      "Advanced insights & trends",
      "Partner comparison dashboard",
      "Full exercise library (37)",
      "Constraints & redlines",
      "Data export",
      "Priority support",
    ],
    features: {
      dailyLog: true,
      basicScores: true,
      exerciseLimit: Infinity,
      historyDays: Infinity,
      insights: true,
      weeklyCheckin: true,
      scenarios: true,
      constraints: true,
      partnerLinking: true,
      exportReports: true,
    } satisfies Features,
  },
} as const;

export type SubscriptionTier = keyof typeof TIERS;
export type TierKey = SubscriptionTier;

export const FEATURE_LABELS: Record<keyof Features, string> = {
  dailyLog: "Daily Logging",
  basicScores: "Score Tracking",
  exerciseLimit: "Exercises",
  historyDays: "History",
  insights: "Advanced Insights",
  weeklyCheckin: "Weekly Check-in",
  scenarios: "Scenario Modes",
  constraints: "Constraints",
  partnerLinking: "Partner Linking",
  exportReports: "Export Reports",
};

export const FEATURE_DESCRIPTIONS: Record<keyof Features, string> = {
  dailyLog: "Log your relationship dimensions daily",
  basicScores: "Track Life Score, Rel Score, and Total Quality",
  exerciseLimit: "Access psychology-grounded exercises",
  historyDays: "View your score history and trends",
  insights: "Pareto frontier analysis and advanced trends",
  weeklyCheckin: "Weekly reflection and goal setting",
  scenarios: "Switch between life scenario modes",
  constraints: "Set redlines and budget constraints",
  partnerLinking: "Link with your partner's account",
  exportReports: "Export monthly PDF reports",
};
