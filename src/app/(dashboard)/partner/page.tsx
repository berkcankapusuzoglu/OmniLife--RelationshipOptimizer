import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { users, scores } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCoupleBonus } from "@/lib/subscription/couple-bonus";
import { PartnerClient } from "./partner-client";
import { BackButton } from "@/components/back-button";

export default async function PartnerPage() {
  const user = await requireAuth();
  const db = getDb();

  let partner = null;
  let partnerScore: number | null = null;

  if (user.partnerId) {
    const [p] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, user.partnerId))
      .limit(1);
    partner = p ?? null;

    if (partner) {
      const [ps] = await db
        .select({ totalQuality: scores.totalQuality })
        .from(scores)
        .where(eq(scores.userId, partner.id))
        .orderBy(desc(scores.createdAt))
        .limit(1);
      partnerScore = ps ? Number(ps.totalQuality) : null;
    }
  }

  // Get user's latest score for the challenge card
  const [userScoreRow] = await db
    .select({ totalQuality: scores.totalQuality })
    .from(scores)
    .where(eq(scores.userId, user.id))
    .orderBy(desc(scores.createdAt))
    .limit(1);
  const userScore = userScoreRow ? Number(userScoreRow.totalQuality) : null;

  const coupleBonus = getCoupleBonus(!!user.partnerId);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <BackButton />
          <h1 className="text-2xl font-medium tracking-tight">Partner</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Link accounts to share tasks and insights
        </p>
      </div>
      <PartnerClient
        userId={user.id}
        userName={user.name?.split(" ")[0] ?? null}
        inviteCode={user.partnerInviteCode}
        partner={partner}
        partnerScore={partnerScore}
        userScore={userScore}
        coupleBonus={coupleBonus}
      />
    </div>
  );
}
