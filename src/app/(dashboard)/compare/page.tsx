import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { scores, dailyLogs } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { getPartnerData } from "./actions";
import { CompareClient } from "./compare-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Heart } from "lucide-react";
import { BackButton } from "@/components/back-button";

export default async function ComparePage() {
  const user = await requireAuth();

  if (!user.partnerId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="space-y-4 pt-6">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-medium">No Partner Linked</h2>
            <p className="text-sm text-muted-foreground">
              Link with your partner to compare scores, identify gaps, and
              strengthen your relationship together.
            </p>
            <Button render={<Link href="/partner" />}>
              Link Partner
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Free users get 7 days, premium get 30
  // For now, treat all as free (7 days) — premium check can be added later
  const { getUserTier } = await import("@/lib/subscription/access");
  const userTier = await getUserTier(user.id);
  const dayLimit = userTier === "premium" ? 30 : 7;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - dayLimit);
  const cutoff = cutoffDate.toISOString().split("T")[0];

  const [myScores, myLogs, partnerData] = await Promise.all([
    getDb()
      .select()
      .from(scores)
      .where(and(eq(scores.userId, user.id), gte(scores.date, cutoff)))
      .orderBy(desc(scores.date)),
    getDb()
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, user.id), gte(dailyLogs.date, cutoff)))
      .orderBy(desc(dailyLogs.date)),
    getPartnerData(user.partnerId, dayLimit),
  ]);

  const myScoresPlain = myScores.map((s) => ({
    date: s.date,
    lifeScore: Number(s.lifeScore),
    relScore: Number(s.relScore),
    totalQuality: Number(s.totalQuality),
  }));

  const myLogsPlain = myLogs.map((l) => ({
    date: l.date,
    vitalityScore: l.vitalityScore,
    growthScore: l.growthScore,
    securityScore: l.securityScore,
    connectionScore: l.connectionScore,
    emotionalScore: l.emotionalScore,
    trustScore: l.trustScore,
    fairnessScore: l.fairnessScore,
    stressScore: l.stressScore,
    autonomyScore: l.autonomyScore,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <BackButton />
          <h1 className="text-2xl font-medium tracking-tight">
            Couples Comparison
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          See how you and {partnerData.partner?.name ?? "your partner"} align
          across all dimensions
        </p>
      </div>
      <CompareClient
        userName={user.name ?? "You"}
        partnerName={partnerData.partner?.name ?? "Partner"}
        myScores={myScoresPlain}
        myLogs={myLogsPlain}
        partnerScores={partnerData.scores}
        partnerLogs={partnerData.logs}
        userTier={userTier}
      />
    </div>
  );
}
