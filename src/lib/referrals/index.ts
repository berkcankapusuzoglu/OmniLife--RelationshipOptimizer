import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";
import { users, referrals } from "@/lib/db/schema";

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
    .select({ id: users.id, trialEndsAt: users.trialEndsAt })
    .from(users)
    .where(eq(users.referralCode, referralCode))
    .limit(1);

  if (!referrer) return;

  // Don't allow self-referral
  if (referrer.id === newUserId) return;

  // Create referral record
  await db.insert(referrals).values({
    id: uuidv4(),
    referrerId: referrer.id,
    referredEmail: newUserEmail,
    referredUserId: newUserId,
    status: "signed_up",
    convertedAt: new Date(),
  });

  // Reward: extend trialEndsAt by 30 days
  const now = new Date();
  const currentEnd =
    referrer.trialEndsAt && new Date(referrer.trialEndsAt) > now
      ? new Date(referrer.trialEndsAt)
      : now;
  const newEnd = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);

  await db
    .update(users)
    .set({ trialEndsAt: newEnd })
    .where(eq(users.id, referrer.id));
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

  // Each sign-up = 1 month. Bonus tiers: 3 total = +0 extra, 5 total = +1 extra
  let monthsEarned = signedUp + rewarded;
  if (total >= 5) monthsEarned += 1; // bonus month at 5
  if (total >= 3) monthsEarned += 0; // tier acknowledged but no extra here

  return { pending, signedUp, rewarded, total, monthsEarned };
}
