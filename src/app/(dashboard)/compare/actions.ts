"use server";

import { getDb } from "@/lib/db";
import { scores, dailyLogs, users } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export async function getPartnerData(partnerId: string, dayLimit: number) {
  const db = getDb();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - dayLimit);
  const cutoff = cutoffDate.toISOString().split("T")[0];

  const [partner, partnerScores, partnerLogs] = await Promise.all([
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, partnerId))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(scores)
      .where(and(eq(scores.userId, partnerId), gte(scores.date, cutoff)))
      .orderBy(desc(scores.date)),
    db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, partnerId), gte(dailyLogs.date, cutoff)))
      .orderBy(desc(dailyLogs.date)),
  ]);

  return {
    partner: partner
      ? { id: partner.id, name: partner.name ?? "Partner" }
      : null,
    scores: partnerScores.map((s) => ({
      date: s.date,
      lifeScore: Number(s.lifeScore),
      relScore: Number(s.relScore),
      totalQuality: Number(s.totalQuality),
    })),
    logs: partnerLogs.map((l) => ({
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
    })),
  };
}
