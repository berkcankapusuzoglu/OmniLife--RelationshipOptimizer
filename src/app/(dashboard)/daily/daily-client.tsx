"use client";

import { DailyLogForm } from "@/components/forms/DailyLogForm";
import { submitDailyLog } from "./actions";

export function DailyLogFormWrapper({ userId }: { userId: string }) {
  return (
    <DailyLogForm
      onSubmit={async (data) => {
        await submitDailyLog({
          userId,
          vitality: data.pillar.vitality,
          growth: data.pillar.growth,
          security: data.pillar.security,
          connection: data.pillar.connection,
          emotional: data.rel.emotional,
          trust: data.rel.trust,
          fairness: data.rel.fairness,
          stress: data.rel.stress,
          autonomy: data.rel.autonomy,
          mood: data.mood,
          energyLevel: data.energy,
          notes: data.notes,
        });
      }}
    />
  );
}
