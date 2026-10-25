import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";
import { users, referrals } from "@/lib/db/schema";
import { earnedMonths, rewardMonthsForNthReferral, trialExtensionDays } from "./rewards";

export {
  REFERRAL_TIERS,
  cumulativeRewardMonths,
  earnedMonths,
  rewardMonthsForNthReferral,
  trialExtensionDays,
} from "./rewards";

function randomChars(n: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < n; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function generateReferralCode(userId: string): Promise<string> {
  const db = getDb();

  // Check if user already has a code
  const [user] = await db
    .select({ referralCode: users.referralCode, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.referralCode) {
    return user.referralCode;
  }

  // Generate code: first name (or "OMNI") + 4 random alphanumeric chars
  const prefix = user?.name
    ? user.name.split(/\s/)[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6)
    : "OMNI";
  const code = `${prefix || "OMNI"}${randomChars(4)}`;

  await db
    .update(users)
    .set({ referralCode: code })
    .where(eq(users.id, userId));

  return code;
}

export async function processReferral(
  referralCode: string,
  newUserId: string,
  newUserEmail: string
): Promise<void> {
  const db = getDb();

  // Find referrer by code
  const [referrer] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.referralCode, referralCode))
    .limit(1);

  if (!referrer) return;

  // Don't allow self-referral
  if (referrer.id === newUserId) return;

  // A replayed signup for the same pair must not create a second rewardable row.
  const [duplicate] = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerId, referrer.id),
        eq(referrals.referredUserId, newUserId)
      )
    )
    .limit(1);

  if (duplicate) return;

  const referralId = uuidv4();
  await db.insert(referrals).values({
    id: referralId,
    referrerId: referrer.id,
    referredEmail: newUserEmail,
    referredUserId: newUserId,
    status: "signed_up",
    convertedAt: new Date(),
  });

  await rewardReferral(referralId, referrer.id);
}

// The reward is gated on this single conditional UPDATE: only the transaction
// that observes `signed_up` gets a row back, so two concurrent runs over the
// same referral can never both extend the trial.
async function rewardReferral(
  referralId: string,
  referrerId: string
): Promise<void> {
  const db = getDb();

  const claimed = await db
    .update(referrals)
    .set({ status: "rewarded" })
    .where(
      and(
        eq(referrals.id, referralId),
        eq(referrals.referrerId, referrerId),
        eq(referrals.status, "signed_up")
      )
    )
    .returning({ id: referrals.id });

  if (claimed.length === 0) return;

  const rewardedRows = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(
      and(eq(referrals.referrerId, referrerId), eq(referrals.status, "rewarded"))
    );

  const months = rewardMonthsForNthReferral(rewardedRows.length);
  if (months <= 0) return;

  // The extension is computed in SQL from the row's own current value, not
  // from a value read earlier in this request: two referrals rewarded
  // concurrently for the same referrer would otherwise both write from the
  // same stale `trialEndsAt` and silently drop one month.
  // Ownership: the grant is keyed to the referrer row the claimed referral
  // points at, never to the signing-up user.
  await db
    .update(users)
    .set({
      trialEndsAt: sql`greatest(coalesce(${users.trialEndsAt}, now()), now()) + make_interval(days => ${trialExtensionDays(months)})`,
    })
    .where(eq(users.id, referrerId));
}

export interface ReferralStats {
  pending: number;
  signedUp: number;
  rewarded: number;
  total: number;
  monthsEarned: number;
}

export async function getReferralStats(
  userId: string
): Promise<ReferralStats> {
  const db = getDb();

  const rows = await db
    .select({ status: referrals.status })
    .from(referrals)
    .where(eq(referrals.referrerId, userId));

  const pending = rows.filter((r) => r.status === "pending").length;
  const signedUp = rows.filter((r) => r.status === "signed_up").length;
  const rewarded = rows.filter((r) => r.status === "rewarded").length;
  const total = rows.length;

  const monthsEarned = earnedMonths({ signedUp, rewarded });

  return { pending, signedUp, rewarded, total, monthsEarned };
}
