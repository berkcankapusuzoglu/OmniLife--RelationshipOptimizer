"use server";

import { getDb } from "@/lib/db";
import { scores, dailyLogs, users } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import { linkedPartnerId } from "@/lib/auth/authorization";
import { getUserTier } from "@/lib/subscription/access";
import { compareCutoff } from "@/lib/subscription/history";
import { TIERS } from "@/lib/subscription/tiers";
import { z } from "zod";

const comparisonWindow = z.union([z.literal(7), z.literal(30)]);

export async function getPartnerData(dayLimit: number) {
  const user = await requireAuth();
  const partnerId = await linkedPartnerId(user);
  if (!partnerId) return { partner: null, scores: [], logs: [] };
  const requestedWindow = comparisonWindow.parse(dayLimit);
  // Server-enforced: the effective window never exceeds the tier's compareDays.
  const tier = await getUserTier(user.id);
  dayLimit = Math.min(requestedWindow, TIERS[tier].features.compareDays);
  const db = getDb();

  // Narrowest of: the tier's compare window and the requested window.
  const requestedCutoff = new Date();
  requestedCutoff.setUTCDate(requestedCutoff.getUTCDate() - dayLimit);
  const cutoff = [compareCutoff(tier), requestedCutoff.toISOString().split("T")[0]].sort().at(-1)!;

  const [partner, partnerScores, partnerLogs] = await Promise.all([
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.id, partnerId), eq(users.partnerId, user.id)))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({
        date: scores.date,
        lifeScore: scores.lifeScore,
        relScore: scores.relScore,
        totalQuality: scores.totalQuality,
      })
      .from(scores)
      .where(and(eq(scores.userId, partnerId), gte(scores.date, cutoff)))
      .orderBy(desc(scores.date)),
    db
      .select({
        date: dailyLogs.date,
        vitalityScore: dailyLogs.vitalityScore,
        growthScore: dailyLogs.growthScore,
        securityScore: dailyLogs.securityScore,
        connectionScore: dailyLogs.connectionScore,
        emotionalScore: dailyLogs.emotionalScore,
        trustScore: dailyLogs.trustScore,
        fairnessScore: dailyLogs.fairnessScore,
        stressScore: dailyLogs.stressScore,
        autonomyScore: dailyLogs.autonomyScore,
      })
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
