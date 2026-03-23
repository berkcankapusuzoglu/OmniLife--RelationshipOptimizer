"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";

interface ScoreCard {
  lifeScore: number;
  relScore: number;
  totalQuality: number;
  date: string;
}

interface DimScores {
  emotional: number;
  trust: number;
  fairness: number;
  stress: number;
  autonomy: number;
}

interface DivergenceItem {
  dimension: string;
  userScore: number;
  partnerScore: number;
  difference: number;
}

interface PartnerDashboardClientProps {
  userName: string;
  partnerName: string;
  userScoreCard: ScoreCard | null;
  partnerScoreCard: ScoreCard | null;
  userDimScores: DimScores | null;
  partnerDimScores: DimScores | null;
  divergences: DivergenceItem[];
}

const DIM_LABELS: Record<string, string> = {
  emotional: "Emotional",
  trust: "Trust",
  fairness: "Fairness",
  stress: "Stress",
  autonomy: "Personal Space",
};

function ScoreCardDisplay({
  label,
  scoreCard,
}: {
  label: string;
  scoreCard: ScoreCard | null;
}) {
  if (!scoreCard) {
    return (
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
        <p className="text-xs text-muted-foreground">{scoreCard.date}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Overall Score</span>
          <span className="font-mono text-lg font-semibold">
            {scoreCard.totalQuality.toFixed(1)}
          </span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Life Score</span>
          <span className="font-mono text-sm">{scoreCard.lifeScore.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Rel. Score</span>
          <span className="font-mono text-sm">{scoreCard.relScore.toFixed(1)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DimensionBar({
  dimension,
  userScore,
  partnerScore,
  userName,
  partnerName,
}: {
  dimension: string;
  userScore: number;
  partnerScore: number;
  userName: string;
  partnerName: string;
}) {
  const diff = Math.abs(userScore - partnerScore);
  const isDiverging = diff >= 3;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium capitalize">
          {DIM_LABELS[dimension] ?? dimension}
        </span>
        {isDiverging && (
          <Badge variant="destructive" className="text-xs">
            Gap: {diff}
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-20 text-xs text-muted-foreground truncate">
            {userName}
          </span>
          <div className="relative h-2 flex-1 rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-blue-500"
              style={{ width: `${(userScore / 10) * 100}%` }}
            />
          </div>
          <span className="w-6 text-right font-mono text-xs">{userScore}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-20 text-xs text-muted-foreground truncate">
            {partnerName}
          </span>
          <div className="relative h-2 flex-1 rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-pink-500"
              style={{ width: `${(partnerScore / 10) * 100}%` }}
            />
          </div>
          <span className="w-6 text-right font-mono text-xs">
            {partnerScore}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PartnerDashboardClient({
  userName,
  partnerName,
  userScoreCard,
  partnerScoreCard,
  userDimScores,
  partnerDimScores,
  divergences,
}: PartnerDashboardClientProps) {
  const dimensions = ["emotional", "trust", "fairness", "stress", "autonomy"];

  return (
    <div className="space-y-6">
      {/* Side-by-side score cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ScoreCardDisplay label={userName} scoreCard={userScoreCard} />
        <ScoreCardDisplay label={partnerName} scoreCard={partnerScoreCard} />
      </div>

      {/* Divergence highlights */}
      {divergences.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-base">Divergence Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {divergences.map((d) => (
              <div
                key={d.dimension}
                className="flex items-center justify-between rounded-md border border-destructive/30 px-3 py-2"
              >
                <span className="text-sm font-medium capitalize">
                  {DIM_LABELS[d.dimension] ?? d.dimension}
                </span>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-blue-400">
                    {userName}: {d.userScore}
                  </span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="text-pink-400">
                    {partnerName}: {d.partnerScore}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    {d.difference}pt gap
                  </Badge>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              Dimensions where scores differ by 3 or more points may indicate
              areas to discuss together.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Both partners' dimension scores */}
      {userDimScores && partnerDimScores && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Relationship Dimensions Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dimensions.map((dim) => (
              <DimensionBar
                key={dim}
                dimension={dim}
                userScore={userDimScores[dim as keyof DimScores]}
                partnerScore={partnerDimScores[dim as keyof DimScores]}
                userName={userName}
                partnerName={partnerName}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {!userDimScores && !partnerDimScores && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Both partners need to log daily scores before comparison data appears.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
