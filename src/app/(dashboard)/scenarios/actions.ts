"use server";

import { getDb } from "@/lib/db";
import { users, scenarioProfiles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { SCENARIO_PRESETS } from "@/lib/scenarios/presets";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guard";
import { resourceId, scenarioMode } from "@/lib/auth/action-inputs";
import { v4 as uuid } from "uuid";
import { hasFeatureAccess } from "@/lib/auth/tier-gate";

export async function activateScenario(
  scenarioId: string,
  mode: string
): Promise<{ error?: string }> {
  const user = await requireAuth();
  mode = scenarioMode.parse(mode);
  const access = await hasFeatureAccess(user.id, "scenarios");
  if (!access.allowed) return { error: "Scenario modes are a Premium feature." };
  const db = getDb();
  const preset = SCENARIO_PRESETS.find((p) => p.mode === mode);
  if (!preset) return { error: "Unknown scenario mode." };
  const parsedId = resourceId.safeParse(scenarioId);
  if (!parsedId.success) {
    // UI presets have symbolic (non-UUID) IDs; activeScenarioId stores an owned UUID row.
    scenarioId = uuid();
    await db.insert(scenarioProfiles).values({ id: scenarioId, userId: user.id, name: preset.name, mode: preset.mode, description: preset.description, weightOverrides: preset.weightOverrides, constraintOverrides: preset.constraintOverrides, isPreset: true });
  } else {
    const [owned] = await db.select({ id: scenarioProfiles.id }).from(scenarioProfiles)
      .where(and(eq(scenarioProfiles.id, parsedId.data), eq(scenarioProfiles.userId, user.id), eq(scenarioProfiles.mode, mode as typeof scenarioProfiles.$inferSelect.mode))).limit(1);
    if (!owned) return { error: "Scenario not found." };
    scenarioId = owned.id;
  }

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

  await db.update(users).set(updateData).where(eq(users.id, user.id));

  revalidatePath("/", "layout");
  return { error: undefined };
}
