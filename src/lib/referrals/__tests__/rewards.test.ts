import { describe, expect, it } from "vitest";
import {
  REFERRAL_TIERS,
  cumulativeRewardMonths,
  earnedMonths,
  rewardMonthsForNthReferral,
  trialExtensionDays,
} from "../rewards";

describe("referral reward tiers", () => {
  it("grants exactly what the published tiers promise", () => {
    for (const tier of REFERRAL_TIERS) {
      expect(cumulativeRewardMonths(tier.referrals)).toBe(tier.months);
    }
  });

  it("gives one month per referral plus the single bonus month at five", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(cumulativeRewardMonths)).toEqual([0, 1, 2, 3, 4, 6, 7]);
  });

  it("derives the per-referral grant from the cumulative curve", () => {
    expect([1, 2, 3, 4, 5, 6].map(rewardMonthsForNthReferral)).toEqual([1, 1, 1, 1, 2, 1]);
    expect(rewardMonthsForNthReferral(0)).toBe(0);
  });
});

describe("trialExtensionDays", () => {
  it("converts whole months into 30-day blocks", () => {
    expect(trialExtensionDays(1)).toBe(30);
    expect(trialExtensionDays(2)).toBe(60);
  });

  it("grants nothing for a zero or negative month count", () => {
    expect(trialExtensionDays(0)).toBe(0);
    expect(trialExtensionDays(-3)).toBe(0);
  });
});

describe("earnedMonths", () => {
  it("never promises more months than were granted", () => {
    expect(earnedMonths({ signedUp: 0, rewarded: 0 })).toBe(0);
    expect(earnedMonths({ signedUp: 2, rewarded: 0 })).toBe(2);
    expect(earnedMonths({ signedUp: 0, rewarded: 5 })).toBe(6);
    // A mixed history only earns the bonus from rewarded rows.
    expect(earnedMonths({ signedUp: 3, rewarded: 2 })).toBe(5);
  });
});
