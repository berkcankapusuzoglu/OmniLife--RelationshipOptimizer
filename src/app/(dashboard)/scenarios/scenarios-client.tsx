"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Brain,
  Coffee,
  Baby,
  AlertTriangle,
  MapPin,
  Check,
} from "lucide-react";
import { SCENARIO_PRESETS } from "@/lib/scenarios/presets";
import { WeightSliders } from "@/components/forms/WeightSliders";
import { activateScenario } from "./actions";
import type { Weights } from "@/lib/engine/types";

const SCENARIO_ICONS: Record<string, React.ReactNode> = {
  default: <Brain className="h-5 w-5" />,
  exam: <BookOpen className="h-5 w-5" />,
  chill: <Coffee className="h-5 w-5" />,
  newborn: <Baby className="h-5 w-5" />,
  crisis: <AlertTriangle className="h-5 w-5" />,
  long_distance: <MapPin className="h-5 w-5" />,
};

export function ScenariosClient({
  activeScenarioId,
  userId,
  currentWeights,
}: {
  activeScenarioId: string | null;
  userId: string;
  currentWeights: Weights;
}) {
  const [previewWeights, setPreviewWeights] = useState<Weights | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  function handlePreview(mode: string) {
    const preset = SCENARIO_PRESETS.find((p) => p.mode === mode);
    if (!preset) return;

    setSelectedMode(mode);
    const overrides = preset.weightOverrides;
    setPreviewWeights({
      alpha: overrides.alpha ?? currentWeights.alpha,
      beta: overrides.beta ?? currentWeights.beta,
      pillar: {
        ...currentWeights.pillar,
        ...overrides.pillar,
      },
      rel: {
        ...currentWeights.rel,
        ...overrides.rel,
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SCENARIO_PRESETS.map((scenario) => {
          const isActive =
            activeScenarioId === scenario.id || selectedMode === scenario.mode;
          return (
            <Card
              key={scenario.id}
              className={isActive ? "border-primary" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {SCENARIO_ICONS[scenario.mode]}
                    <CardTitle className="text-base">
                      {scenario.name}
                    </CardTitle>
                  </div>
                  {activeScenarioId === scenario.id && (
                    <Badge>
                      <Check className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {scenario.description}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(scenario.mode)}
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await activateScenario(userId, scenario.id, scenario.mode);
                    }}
                    disabled={activeScenarioId === scenario.id}
                  >
                    Activate
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {previewWeights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Weight Preview
              {selectedMode && (
                <Badge variant="outline" className="ml-2">
                  {selectedMode}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeightSliders
              weights={previewWeights}
              onChange={setPreviewWeights}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
