import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { scores, dailyLogs, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PartnerDashboardClient } from "./partner-dashboard-client";

export default async function PartnerDashboardPage() {
  const user = await requireAuth();
  const db = getDb();

  if (!user.partnerId) {
    redirect("/partner");
  }

  // Fetch partner info
  const [partner] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, user.partnerId))
    .limit(1);

  if (!partner) {
    redirect("/partner");
  }

  // Fetch both partners' last 30 days of scores and logs
  const [userScores, partnerScores, userLogs, partnerLogs] = await Promise.all([
    db
      .select()
      .from(scores)
      .where(eq(scores.userId, user.id))
      .orderBy(desc(scores.date))
      .limit(30),
    db
      .select()
      .from(scores)
      .where(eq(scores.userId, partner.id))
      .orderBy(desc(scores.date))
      .limit(30),
    db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, user.id))
      .orderBy(desc(dailyLogs.date))
      .limit(30),
    db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, partner.id))
      .orderBy(desc(dailyLogs.date))
      .limit(30),
  ]);

  // Compute latest dimension scores for both
  const userLatestLog = userLogs[0];
  const partnerLatestLog = partnerLogs[0];

  const userDimScores = userLatestLog
    ? {
        emotional: userLatestLog.emotionalScore,
        trust: userLatestLog.trustScore,
        fairness: userLatestLog.fairnessScore,
        stress: userLatestLog.stressScore,
        autonomy: userLatestLog.autonomyScore,
      }
    : null;

  const partnerDimScores = partnerLatestLog
    ? {
        emotional: partnerLatestLog.emotionalScore,
        trust: partnerLatestLog.trustScore,
        fairness: partnerLatestLog.fairnessScore,
        stress: partnerLatestLog.stressScore,
        autonomy: partnerLatestLog.autonomyScore,
      }
    : null;

  // Build score card data
  const userScoreCard = userScores[0]
    ? {
        lifeScore: Number(userScores[0].lifeScore),
        relScore: Number(userScores[0].relScore),
        totalQuality: Number(userScores[0].totalQuality),
        date: userScores[0].date,
      }
    : null;

  const partnerScoreCard = partnerScores[0]
    ? {
        lifeScore: Number(partnerScores[0].lifeScore),
        relScore: Number(partnerScores[0].relScore),
        totalQuality: Number(partnerScores[0].totalQuality),
        date: partnerScores[0].date,
      }
    : null;

  // Detect divergences (dimensions differing by 3+ points)
  const divergences: { dimension: string; userScore: number; partnerScore: number; difference: number }[] = [];
  if (userDimScores && partnerDimScores) {
    const dims = ["emotional", "trust", "fairness", "stress", "autonomy"] as const;
    for (const dim of dims) {
      const diff = Math.abs(userDimScores[dim] - partnerDimScores[dim]);
      if (diff >= 3) {
        divergences.push({
          dimension: dim,
          userScore: userDimScores[dim],
          partnerScore: partnerDimScores[dim],
          difference: diff,
        });
      }
    }
    divergences.sort((a, b) => b.difference - a.difference);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Partner Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Side-by-side view with {partner.name ?? partner.email}
        </p>
      </div>
      <PartnerDashboardClient
        userName={user.name ?? "You"}
        partnerName={partner.name ?? "Partner"}
        userScoreCard={userScoreCard}
        partnerScoreCard={partnerScoreCard}
        userDimScores={userDimScores}
        partnerDimScores={partnerDimScores}
        divergences={divergences}
      />
    </div>
  );
}
