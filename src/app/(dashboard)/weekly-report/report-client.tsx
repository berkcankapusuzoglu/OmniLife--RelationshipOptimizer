"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Dumbbell,
  AlertTriangle,
  Target,
  Calendar,
  Trophy,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface LogData {
  date: string;
  vitality: number;
  growth: number;
  security: number;
  connection: number;
  emotional: number;
  trust: number;
  fairness: number;
  stress: number;
  autonomy: number;
  mood: number;
  energyLevel: number;
}

interface ScoreData {
  date: string;
  lifeScore: number;
  relScore: number;
  totalQuality: number;
  penaltyApplied: number;
  constraintViolations: Array<{
    constraintName: string;
    dimension: string;
    severity: string;
  }>;
}

interface WeeklyReportClientProps {
  thisWeekLogs: LogData[];
  lastWeekLogs: LogData[];
  thisWeekScores: ScoreData[];
  lastWeekScores: ScoreData[];
  exercisesCompleted: number;
  currentStreak: number;
  longestStreak: number;
  weekRange: { start: string; end: string };
}

const DIMENSION_LABELS: Record<string, string> = {
  vitality: "Vitality",
  growth: "Growth",
  security: "Security",
  connection: "Connection",
  emotional: "Emotional",
  trust: "Trust",
  fairness: "Fairness",
  stress: "Stress",
  autonomy: "Autonomy",
};

const ALL_DIMENSIONS = Object.keys(DIMENSION_LABELS);

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getDimensionValues(logs: LogData[], dim: string): number[] {
  return logs.map((l) => l[dim as keyof LogData] as number);
}

function DeltaArrow({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.1) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  if (delta > 0) {
    return <ArrowUp className="h-4 w-4 text-green-500" />;
  }
  return <ArrowDown className="h-4 w-4 text-red-500" />;
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}`;
}

export function WeeklyReportClient({
  thisWeekLogs,
  lastWeekLogs,
  thisWeekScores,
  lastWeekScores,
  exercisesCompleted,
  currentStreak,
  longestStreak,
  weekRange,
}: WeeklyReportClientProps) {
  if (thisWeekLogs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No logs this week yet</h3>
          <p className="text-sm text-muted-foreground">
            Start logging daily to see your weekly report.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Compute averages
  const thisAvgLife = avg(thisWeekScores.map((s) => s.lifeScore));
  const lastAvgLife = avg(lastWeekScores.map((s) => s.lifeScore));
  const thisAvgRel = avg(thisWeekScores.map((s) => s.relScore));
  const lastAvgRel = avg(lastWeekScores.map((s) => s.relScore));
  const thisAvgTotal = avg(thisWeekScores.map((s) => s.totalQuality));
  const lastAvgTotal = avg(lastWeekScores.map((s) => s.totalQuality));

  const lifeDelta = lastWeekScores.length > 0 ? thisAvgLife - lastAvgLife : 0;
  const relDelta = lastWeekScores.length > 0 ? thisAvgRel - lastAvgRel : 0;
  const totalDelta =
    lastWeekScores.length > 0 ? thisAvgTotal - lastAvgTotal : 0;

  // Best / worst day
  const bestDay = thisWeekScores.reduce(
    (best, s) => (s.totalQuality > best.totalQuality ? s : best),
    thisWeekScores[0]
  );
  const worstDay = thisWeekScores.reduce(
    (worst, s) => (s.totalQuality < worst.totalQuality ? s : worst),
    thisWeekScores[0]
  );

  // Dimension analysis
  const dimensionDeltas = ALL_DIMENSIONS.map((dim) => {
    const thisAvg = avg(getDimensionValues(thisWeekLogs, dim));
    const lastAvg =
      lastWeekLogs.length > 0
        ? avg(getDimensionValues(lastWeekLogs, dim))
        : thisAvg;
    return {
      dim,
      label: DIMENSION_LABELS[dim],
      thisAvg,
      lastAvg,
      delta: lastWeekLogs.length > 0 ? thisAvg - lastAvg : 0,
    };
  });

  const improved = dimensionDeltas
    .filter((d) => d.delta > 0.3)
    .sort((a, b) => b.delta - a.delta);
  const declined = dimensionDeltas
    .filter((d) => d.delta < -0.3)
    .sort((a, b) => a.delta - b.delta);

  // Constraint violations summary
  const allViolations = thisWeekScores.flatMap((s) => s.constraintViolations);
  const violationsByDimension = allViolations.reduce(
    (acc, v) => {
      const key = v.dimension;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Focus for next week: lowest dimension
  const lowestDimension = dimensionDeltas.reduce((lowest, d) =>
    d.thisAvg < lowest.thisAvg ? d : lowest
  );

  return (
    <div className="space-y-4">
      {/* Score overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Avg Life Score</p>
              <p className="text-2xl font-bold">{thisAvgLife.toFixed(1)}</p>
              {lastWeekScores.length > 0 && (
                <div className="mt-1 flex items-center justify-center gap-1 text-sm">
                  <DeltaArrow delta={lifeDelta} />
                  <span
                    className={
                      lifeDelta > 0
                        ? "text-green-500"
                        : lifeDelta < 0
                          ? "text-red-500"
                          : "text-muted-foreground"
                    }
                  >
                    {formatDelta(lifeDelta)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Avg Relationship Score
              </p>
              <p className="text-2xl font-bold">{thisAvgRel.toFixed(1)}</p>
              {lastWeekScores.length > 0 && (
                <div className="mt-1 flex items-center justify-center gap-1 text-sm">
                  <DeltaArrow delta={relDelta} />
                  <span
                    className={
                      relDelta > 0
                        ? "text-green-500"
                        : relDelta < 0
                          ? "text-red-500"
                          : "text-muted-foreground"
                    }
                  >
                    {formatDelta(relDelta)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Avg Total Quality
              </p>
              <p className="text-2xl font-bold text-primary">
                {thisAvgTotal.toFixed(1)}
              </p>
              {lastWeekScores.length > 0 && (
                <div className="mt-1 flex items-center justify-center gap-1 text-sm">
                  <DeltaArrow delta={totalDelta} />
                  <span
                    className={
                      totalDelta > 0
                        ? "text-green-500"
                        : totalDelta < 0
                          ? "text-red-500"
                          : "text-muted-foreground"
                    }
                  >
                    {formatDelta(totalDelta)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best / Worst Day */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-green-500" />
              Best Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{bestDay.date}</p>
            <p className="text-sm text-muted-foreground">
              Total Quality: {bestDay.totalQuality.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Toughest Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{worstDay.date}</p>
            <p className="text-sm text-muted-foreground">
              Total Quality: {worstDay.totalQuality.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dimension Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dimension Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastWeekLogs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No comparison data from last week. Showing this week's averages.
            </p>
          )}

          <div className="grid gap-3">
            {dimensionDeltas.map((d) => (
              <div
                key={d.dim}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <DeltaArrow delta={d.delta} />
                  <span className="text-sm font-medium">{d.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    {d.thisAvg.toFixed(1)}
                  </span>
                  {lastWeekLogs.length > 0 && Math.abs(d.delta) > 0.1 && (
                    <span
                      className={`text-xs ${
                        d.delta > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {formatDelta(d.delta)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {improved.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium text-green-600">
                  Improved
                </p>
                <div className="flex flex-wrap gap-2">
                  {improved.map((d) => (
                    <Badge
                      key={d.dim}
                      variant="secondary"
                      className="border-green-200 bg-green-50 text-green-700"
                    >
                      <TrendingUp className="mr-1 h-3 w-3" />
                      {d.label} ({formatDelta(d.delta)})
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {declined.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-red-600">Declined</p>
              <div className="flex flex-wrap gap-2">
                {declined.map((d) => (
                  <Badge
                    key={d.dim}
                    variant="secondary"
                    className="border-red-200 bg-red-50 text-red-700"
                  >
                    <TrendingDown className="mr-1 h-3 w-3" />
                    {d.label} ({formatDelta(d.delta)})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Streak</p>
                <p className="text-lg font-bold">
                  {currentStreak} day{currentStreak !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Dumbbell className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Exercises Done
                </p>
                <p className="text-lg font-bold">{exercisesCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Violations</p>
                <p className="text-lg font-bold">{allViolations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Constraint violations detail */}
      {allViolations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Constraint Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(violationsByDimension).map(([dim, count]) => (
                <div
                  key={dim}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <span className="text-sm">
                    {DIMENSION_LABELS[dim] ?? dim}
                  </span>
                  <Badge variant="destructive">{count} violation{count !== 1 ? "s" : ""}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Focus for next week */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Focus for Next Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Your lowest dimension this week was{" "}
            <strong>{lowestDimension.label}</strong> (avg{" "}
            {lowestDimension.thisAvg.toFixed(1)}/10). Consider focusing on
            exercises and habits that target this area.
          </p>
          {lowestDimension.dim === "stress" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Since stress is inverted (lower = better), this suggests your
              stress levels are high. Try stress-reduction exercises and
              boundary-setting.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
