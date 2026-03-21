"use client";

import { useState } from "react";
import { DailyLogForm } from "@/components/forms/DailyLogForm";
import { MilestoneToast } from "@/components/milestone-toast";
import { submitDailyLog } from "./actions";
import type { Milestone } from "@/lib/milestones";

export function DailyLogFormWrapper({ userId }: { userId: string }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  return (
    <>
      <DailyLogForm
        onSubmit={async (data) => {
          const result = await submitDailyLog({
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

          if (result?.milestones?.length) {
            setMilestones(result.milestones);
          }
        }}
      />
      {milestones.length > 0 && (
        <MilestoneToast
          milestones={milestones}
          onDismiss={() => setMilestones([])}
        />
      )}
    </>
  );
}
