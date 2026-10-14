import { requireAuth } from "@/lib/auth/guard";
import { ScenariosClient } from "./scenarios-client";
import { getUserTier } from "@/lib/subscription/access";
import { getDb } from "@/lib/db";
import { scenarioProfiles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { SCENARIO_PRESETS } from "@/lib/scenarios/presets";

export default async function ScenariosPage() {
  const user = await requireAuth();
  const userTier = await getUserTier(user.id);
  const [activeScenario] = user.activeScenarioId
    ? await getDb().select({ mode: scenarioProfiles.mode }).from(scenarioProfiles)
      .where(and(eq(scenarioProfiles.id, user.activeScenarioId), eq(scenarioProfiles.userId, user.id))).limit(1)
    : [];
  const activePresetId = SCENARIO_PRESETS.find((preset) => preset.mode === activeScenario?.mode)?.id ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Scenarios</h1>
        <p className="text-sm text-muted-foreground">
          Switch optimization profiles for different life situations
        </p>
      </div>
      <ScenariosClient
        activeScenarioId={activePresetId}
        userTier={userTier}
        currentWeights={{
          alpha: Number(user.alphaWeight),
          beta: Number(user.betaWeight),
          pillar: {
            vitality: Number(user.pillarVitalityWeight),
            growth: Number(user.pillarGrowthWeight),
            security: Number(user.pillarSecurityWeight),
            connection: Number(user.pillarConnectionWeight),
          },
          rel: {
            emotional: Number(user.relEmotionalWeight),
            trust: Number(user.relTrustWeight),
            fairness: Number(user.relFairnessWeight),
            stress: Number(user.relStressWeight),
            autonomy: Number(user.relAutonomyWeight),
          },
        }}
      />
    </div>
  );
}
