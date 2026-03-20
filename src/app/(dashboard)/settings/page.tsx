import { requireAuth } from "@/lib/auth/guard";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, weights, and preferences
        </p>
      </div>
      <SettingsClient
        user={{
          id: user.id,
          name: user.name ?? "",
          email: user.email,
        }}
        weights={{
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
