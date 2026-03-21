import { requireAuth } from "@/lib/auth/guard";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./onboarding-client";
import { SCENARIO_PRESETS } from "@/lib/scenarios/presets";

export default async function OnboardingPage() {
  const user = await requireAuth();

  // If onboarding is already completed, go to dashboard
  if (user.onboardingCompleted) {
    redirect("/overview");
  }

  // Pass only plain data to the client component (no functions, no class instances)
  const scenarioPresets = SCENARIO_PRESETS.map((p) => ({
    id: p.id,
    name: p.name,
    mode: p.mode,
    description: p.description,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to OmniLife
        </h1>
        <p className="mt-2 text-muted-foreground">
          Let's set up your relationship optimizer in just a few steps
        </p>
      </div>
      <OnboardingClient userId={user.id} scenarioPresets={scenarioPresets} />
    </div>
  );
}
