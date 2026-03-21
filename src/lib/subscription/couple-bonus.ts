export const COUPLE_BONUS = {
  /** Total exercises available (free tier: 5, couple bonus: 8) */
  exerciseLimit: 8,
  /** Days of history visible (free tier: 7, couple bonus: 14) */
  historyDays: 14,
  /** Access to couple comparison view */
  coupleComparisonView: true,
  /** Extra exercises unlocked by linking partner */
  extraExercises: 3,
} as const;

const FREE_TIER = {
  exerciseLimit: 5,
  historyDays: 7,
  coupleComparisonView: false,
  extraExercises: 0,
} as const;

export interface CoupleBonus {
  isCouple: boolean;
  exerciseLimit: number;
  historyDays: number;
  coupleComparisonView: boolean;
  extraExercises: number;
}

export function getCoupleBonus(hasPartner: boolean): CoupleBonus {
  if (hasPartner) {
    return {
      isCouple: true,
      ...COUPLE_BONUS,
    };
  }

  return {
    isCouple: false,
    ...FREE_TIER,
  };
}
