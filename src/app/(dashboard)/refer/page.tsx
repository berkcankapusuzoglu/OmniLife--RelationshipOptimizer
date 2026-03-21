import { requireAuth } from "@/lib/auth/guard";
import { generateReferralCode, getReferralStats } from "@/lib/referrals";
import { ReferClient } from "./refer-client";

export default async function ReferPage() {
  const user = await requireAuth();

  // Ensure user has a referral code
  const referralCode = await generateReferralCode(user.id);
  const stats = await getReferralStats(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Refer Friends</h1>
        <p className="text-sm text-muted-foreground">
          Share OmniLife and earn free Premium time
        </p>
      </div>
      <ReferClient
        referralCode={referralCode}
        userName={user.name ?? ""}
        stats={{
          pending: stats.pending,
          signedUp: stats.signedUp,
          rewarded: stats.rewarded,
          total: stats.total,
          monthsEarned: stats.monthsEarned,
        }}
      />
    </div>
  );
}
