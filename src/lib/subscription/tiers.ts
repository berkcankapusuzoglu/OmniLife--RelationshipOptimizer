export type SubscriptionTier = "free" | "premium";

export type Features = {
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
};

export const TIERS = {
  free: {
    name: "Free",
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
    },
  },
  premium: {
    name: "Premium",
    price: { monthly: 7.99, yearly: 59.99 },
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
    },
  },
} as const;

export const FEATURE_LABELS: Record<keyof Features, string> = {
  dailyLog: "Daily Logging",
  basicScores: "Life & Relationship Scores",
  exerciseLimit: "Connection Exercises",
  historyDays: "Score History",
  insights: "Pareto Frontier & Insights",
  weeklyCheckin: "Weekly Check-ins",
  scenarios: "Scenario Modes",
  constraints: "Custom Constraints",
  partnerLinking: "Partner Linking",
  exportReports: "Export Reports",
};

export const FEATURE_DESCRIPTIONS: Record<keyof Features, string> = {
  dailyLog: "Log your daily life and relationship scores",
  basicScores: "See your computed life, relationship, and total quality scores",
  exerciseLimit: "Access curated connection exercises based on your scores",
  historyDays: "View your score history and track progress over time",
  insights: "Explore the Pareto frontier and get deep analytical insights",
  weeklyCheckin: "Reflect on your week with guided check-ins",
  scenarios: "Switch between optimization profiles for different life situations",
  constraints: "Set redlines, time budgets, and energy limits",
  partnerLinking: "Link with your partner for shared tracking",
  exportReports: "Export your data and progress reports",
};
