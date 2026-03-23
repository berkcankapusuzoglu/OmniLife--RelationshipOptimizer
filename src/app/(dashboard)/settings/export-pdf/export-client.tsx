"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { generateReport } from "./actions";
import {
  FileText,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import type { TherapistReportData } from "@/lib/export/therapist-report";

interface ExportClientProps {
  userTier: string;
  userName: string;
}

export function ExportClient({ userTier, userName }: ExportClientProps) {
  const [reportData, setReportData] = useState<TherapistReportData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(30);
  const [isPending, startTransition] = useTransition();

  if (userTier !== "premium") {
    return (
      <UpgradePrompt featureDescription="Export detailed reports to share with your therapist, including score trends, dimension analysis, and weekly reflections." />
    );
  }

  function handleGenerate() {
    startTransition(async () => {
      setError(null);
      const result = await generateReport(daysBack);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setReportData(result.data);
      }
    });
  }

  function handlePrint() {
    window.print();
  }

  const trendIcon = (trend: string) => {
    if (trend === "improving")
      return <TrendingUp className="size-4 text-green-500" />;
    if (trend === "declining")
      return <TrendingDown className="size-4 text-red-500" />;
    return <Minus className="size-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Controls — hidden when printing */}
      <Card className="print:hidden">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium" htmlFor="daysBack">
              Report Period
            </label>
            <select
              id="daysBack"
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={isPending}>
              <FileText className="size-4" />
              {isPending ? "Generating..." : "Generate Report"}
            </Button>
            {reportData && (
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="size-4" />
                Print / Save PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive print:hidden">
          {error}
        </div>
      )}

      {/* Report Content */}
      {reportData && (
        <div className="space-y-8 print:space-y-6" id="therapist-report">
          {/* Header */}
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold">
              Relationship Wellness Report
            </h2>
            <p className="text-sm text-muted-foreground">
              Prepared for {reportData.userName} &mdash;{" "}
              {reportData.periodStart} to {reportData.periodEnd}
            </p>
            <p className="text-xs text-muted-foreground">
              Generated on{" "}
              {new Date(reportData.generatedAt).toLocaleDateString()} |{" "}
              {reportData.totalLogsInPeriod} daily logs recorded
            </p>
          </div>

          {/* Score Summary */}
          <section className="space-y-3">
            <h3 className="text-lg font-medium">Score Summary</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-xs text-muted-foreground">Life Score</p>
                  <p className="text-2xl font-bold">
                    {reportData.scoreSummary.latestLifeScore?.toFixed(1) ??
                      "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    avg {reportData.scoreSummary.avgLifeScore.toFixed(1)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Relationship Score
                  </p>
                  <p className="text-2xl font-bold">
                    {reportData.scoreSummary.latestRelScore?.toFixed(1) ??
                      "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    avg {reportData.scoreSummary.avgRelScore.toFixed(1)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Overall Score
                  </p>
                  <p className="text-2xl font-bold">
                    {reportData.scoreSummary.latestTotalQuality?.toFixed(1) ??
                      "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    avg {reportData.scoreSummary.avgTotalQuality.toFixed(1)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 9-Dimension Trends */}
          <section className="space-y-3">
            <h3 className="text-lg font-medium">Dimension Trends</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reportData.dimensionTrends.map((dim) => (
                <Card key={dim.dimension}>
                  <CardContent className="flex items-center gap-3 py-3">
                    {trendIcon(dim.trend)}
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">
                        {dim.dimension}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        avg {dim.average} &middot; {dim.trend}
                      </p>
                    </div>
                    <div className="text-right">
                      {dim.values.length > 0 && (
                        <p className="text-sm font-medium">
                          {dim.values[dim.values.length - 1].value}/10
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Constraint Violations */}
          {reportData.constraintViolations.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-lg font-medium">Constraint Violations</h3>
              <div className="space-y-2">
                {reportData.constraintViolations.map((v, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center gap-3 py-3">
                      <AlertTriangle
                        className={`size-4 ${
                          v.latestSeverity === "critical"
                            ? "text-red-500"
                            : "text-yellow-500"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {v.constraintName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.dimension} &middot; {v.type} &middot;{" "}
                          {v.occurrences} occurrence
                          {v.occurrences !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Exercises Completed */}
          {reportData.exercises.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-lg font-medium">Exercises</h3>
              <div className="space-y-2">
                {reportData.exercises.map((ex, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center gap-3 py-3">
                      {ex.wasCompleted ? (
                        <CheckCircle className="size-4 text-green-500" />
                      ) : (
                        <Calendar className="size-4 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{ex.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ex.targetDimension} &middot; {ex.date}
                          {ex.rating ? ` · Rating: ${ex.rating}/5` : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Weekly Reflections */}
          {reportData.weeklyReflections.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-lg font-medium">Weekly Reflections</h3>
              <div className="space-y-3">
                {reportData.weeklyReflections.map((w, i) => (
                  <Card key={i}>
                    <CardContent className="space-y-2 py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          Week of {w.weekStart}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Satisfaction: {w.overallSatisfaction}/10
                        </p>
                      </div>
                      {w.highlight && (
                        <p className="text-sm">
                          <span className="font-medium text-muted-foreground">
                            Highlight:{" "}
                          </span>
                          {w.highlight}
                        </p>
                      )}
                      {w.challenge && (
                        <p className="text-sm">
                          <span className="font-medium text-muted-foreground">
                            Challenge:{" "}
                          </span>
                          {w.challenge}
                        </p>
                      )}
                      {w.gratitude && (
                        <p className="text-sm">
                          <span className="font-medium text-muted-foreground">
                            Gratitude:{" "}
                          </span>
                          {w.gratitude}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Footer */}
          <div className="border-t pt-4 text-center text-xs text-muted-foreground">
            <p>
              This report was generated by OmniLife Relationship Optimizer.
            </p>
            <p>
              It is intended as a supplementary tool for therapeutic
              discussions, not a diagnostic instrument.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
