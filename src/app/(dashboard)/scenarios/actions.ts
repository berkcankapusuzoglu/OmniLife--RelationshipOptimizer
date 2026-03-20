"use server";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SCENARIO_PRESETS } from "@/lib/scenarios/presets";
import { revalidatePath } from "next/cache";

export async function activateScenario(
  userId: string,
  scenarioId: string,
  mode: string
) {
  const db = getDb();
  const preset = SCENARIO_PRESETS.find((p) => p.mode === mode);
  if (!preset) return;

  const overrides = preset.weightOverrides;

  const updateData: Record<string, unknown> = {
    activeScenarioId: scenarioId,
  };

  if (overrides.alpha != null) updateData.alphaWeight = overrides.alpha.toString();
  if (overrides.beta != null) updateData.betaWeight = overrides.beta.toString();
  if (overrides.pillar?.vitality != null)
    updateData.pillarVitalityWeight = overrides.pillar.vitality.toString();
  if (overrides.pillar?.growth != null)
    updateData.pillarGrowthWeight = overrides.pillar.growth.toString();
  if (overrides.pillar?.security != null)
    updateData.pillarSecurityWeight = overrides.pillar.security.toString();
  if (overrides.pillar?.connection != null)
    updateData.pillarConnectionWeight = overrides.pillar.connection.toString();
  if (overrides.rel?.emotional != null)
    updateData.relEmotionalWeight = overrides.rel.emotional.toString();
  if (overrides.rel?.trust != null)
    updateData.relTrustWeight = overrides.rel.trust.toString();
  if (overrides.rel?.fairness != null)
    updateData.relFairnessWeight = overrides.rel.fairness.toString();
  if (overrides.rel?.stress != null)
    updateData.relStressWeight = overrides.rel.stress.toString();
  if (overrides.rel?.autonomy != null)
    updateData.relAutonomyWeight = overrides.rel.autonomy.toString();

  await db.update(users).set(updateData).where(eq(users.id, userId));

  revalidatePath("/", "layout");
}
