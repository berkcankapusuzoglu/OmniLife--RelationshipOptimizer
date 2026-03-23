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
  aiCoaching: boolean;
  therapistExport: boolean;
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
      "3 exercises per week",
      "Partner linking",
    ],
    features: {
      dailyLog: true,
      basicScores: true,
      exerciseLimit: 3,
      historyDays: 7,
      insights: false,
      weeklyCheckin: true,
      scenarios: false,
      constraints: false,
      partnerLinking: true,
      exportReports: false,
      aiCoaching: false,
      therapistExport: false,
    } satisfies Features,
  },
  pro: {
    name: "Pro",
    monthlyPrice: 4.99,
    yearlyPrice: 39.99,
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
      insights: true,
      weeklyCheckin: true,
      scenarios: true,
      constraints: true,
      partnerLinking: true,
      exportReports: true,
      aiCoaching: false,
      therapistExport: false,
    } satisfies Features,
  },
  premium: {
    name: "Premium",
    monthlyPrice: 7.99,
    yearlyPrice: 59.99,
    featureList: [
      "Everything in Pro",
      "AI relationship coaching",
      "Therapist export reports",
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
      aiCoaching: true,
      therapistExport: true,
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
  constraints: "Limits & Boundaries",
  partnerLinking: "Partner Linking",
  exportReports: "Export Reports",
  aiCoaching: "AI Coaching",
  therapistExport: "Therapist Export",
};

export const FEATURE_DESCRIPTIONS: Record<keyof Features, string> = {
  dailyLog: "Log your relationship dimensions daily",
  basicScores: "Track Life Score, Relationship Score, and Overall Score",
  exerciseLimit: "Access psychology-grounded exercises",
  historyDays: "View your score history and trends",
  insights: "Balance analysis and advanced trends",
  weeklyCheckin: "Weekly reflection and goal setting",
  scenarios: "Switch between life scenario modes",
  constraints: "Set limits and boundaries for your scores",
  partnerLinking: "Link with your partner's account",
  exportReports: "Export monthly PDF reports",
  aiCoaching: "Get personalized AI coaching insights",
  therapistExport: "Generate detailed reports for your therapist",
};
