"use client";

import { WeeklyCheckinWizard } from "@/components/forms/WeeklyCheckinWizard";
import { submitWeeklyCheckin } from "./actions";

export function WeeklyCheckinWrapper({
  hasPartner,
}: {
  hasPartner: boolean;
}) {
  return (
    <WeeklyCheckinWizard
      hasPartner={hasPartner}
      onSubmit={async (data) => {
        await submitWeeklyCheckin({
          highlight: data.highlight,
          challenge: data.frictionDescription,
          gratitude: data.gratitude,
          partnerAppreciation: data.partnerAppreciation,
          overallSatisfaction: Math.round(
            Object.values(data.satisfaction).reduce((a, b) => a + b, 0) /
              Object.values(data.satisfaction).length
          ),
          weeklyGoals: data.goals
            .split("\n")
            .map((g) => g.trim())
            .filter(Boolean),
        });
      }}
    />
  );
}
