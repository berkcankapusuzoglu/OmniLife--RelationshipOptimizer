export const TIERS = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "Daily logging",
      "Basic scoring engine",
      "7-day history",
      "1 scenario profile",
    ],
  },
  premium: {
    name: "Premium",
    monthlyPrice: 7.99,
    yearlyPrice: 59.99,
    features: [
      "Everything in Free",
      "Unlimited history",
      "Unlimited scenarios",
      "Advanced insights & trends",
      "Partner comparison dashboard",
      "Exercise library",
      "Data export",
      "Priority support",
    ],
  },
} as const;

export type TierKey = keyof typeof TIERS;
