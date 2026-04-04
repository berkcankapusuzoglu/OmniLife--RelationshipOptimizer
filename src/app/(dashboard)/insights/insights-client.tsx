"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Lightbulb, TrendingUp, Target, Zap, MapPin, HelpCircle, X } from "lucide-react";
import { ParetoChart } from "@/components/charts/ParetoChart";
import { PremiumGate } from "@/components/premium-gate";
import type { Recommendation, OptimizerResult, ParetoAnalysis } from "@/lib/engine/types";
import type { ActionPlanItem } from "@/lib/recommendations/action-plan";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";

interface InsightsClientProps {
  historicalPoints: { lifeScore: number; relScore: number; date: string }[];
  frontierPoints: { lifeScore: number; relScore: number; date: string }[];
  currentPoint: { lifeScore: number; relScore: number } | null;
  recommendations: Recommendation[];
  trendData: {
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
  }[];
  userTier: string;
  actionPlan?: ActionPlanItem[];
  partnerPoints?: { lifeScore: number; relScore: number; date: string }[];
  paretoAnalysis?: ParetoAnalysis | null;
  optimizerResult?: OptimizerResult | null;
}

const PILLAR_COLORS: Record<string, string> = {
  vitality: "#3b82f6",
  growth: "#f97316",
  security: "#84cc16",
  connection: "#ec4899",
};

const REL_COLORS: Record<string, string> = {
  emotional: "#8b5cf6",
  trust: "#06b6d4",
  fairness: "#f59e0b",
  stress: "#ef4444",
  autonomy: "#22c55e",
};

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors ml-1"
        aria-label="More info"
      >
        {open ? <X className="h-3.5 w-3.5" /> : <HelpCircle className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <span className="absolute left-6 top-0 z-10 w-64 rounded-md border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md">
          {text}
        </span>
      )}
    </span>
  );
}

function getPriorityIcon(priority: number) {
  if (priority >= 8)
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  if (priority >= 5) return <TrendingUp className="h-4 w-4 text-amber-400" />;
  return <Lightbulb className="h-4 w-4 text-emerald-400" />;
}

function getPriorityVariant(priority: number) {
  if (priority >= 8) return "destructive" as const;
  if (priority >= 5) return "default" as const;
  return "secondary" as const;
}

export function InsightsClient({
  historicalPoints,
  frontierPoints,
  currentPoint,
  recommendations,
  trendData,
  userTier,
  actionPlan = [],
  partnerPoints,
  paretoAnalysis,
  optimizerResult,
}: InsightsClientProps) {
  return (
    <Tabs defaultValue="recommendations" className="space-y-4">
      <TabsList>
        <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        <TabsTrigger value="action-plan">Action Plan</TabsTrigger>
        <TabsTrigger value="pareto">Balance Chart</TabsTrigger>
        <TabsTrigger value="optimizer">Optimizer</TabsTrigger>
        <TabsTrigger value="trends">Trends</TabsTrigger>
      </TabsList>

      <TabsContent value="recommendations" className="space-y-4">
        {recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <Card key={rec.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {getPriorityIcon(rec.priority)}
                  <CardTitle className="text-base">{rec.title}</CardTitle>
                  <Badge variant={getPriorityVariant(rec.priority)} className="ml-auto">
                    {rec.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{rec.description}</p>
                <Separator />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {rec.targetDimension}
                  </Badge>
                  <span>{rec.theoryBasis}</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Log your daily scores to get personalized recommendations.
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="action-plan" className="space-y-4">
        {actionPlan.length > 0 ? (
          actionPlan.map((item) => (
            <Card key={item.dimension}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-400" />
                  <CardTitle className="text-base capitalize">{item.dimension}</CardTitle>
                  <Badge variant="outline" className="ml-auto text-xs">
                    Gap: {item.gap}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Current: <span className="font-mono font-medium text-foreground">{item.currentScore}</span>
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">
                    Target: <span className="font-mono font-medium text-emerald-400">{item.targetScore}</span>
                  </span>
                </div>
                {item.exercises.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Recommended exercises:</p>
                      {item.exercises.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span>{ex.title}</span>
                          <Badge variant="secondary" className="text-xs">{ex.durationMinutes}m</Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Log your daily scores to generate an action plan.
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="pareto">
        <PremiumGate userTier={userTier} feature="insights">
          <Card>
            <CardHeader>
              <CardTitle>Life–Relationship Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {historicalPoints.length > 0 ? (
                <ParetoChart
                  historicalPoints={historicalPoints}
                  frontierPoints={frontierPoints}
                  currentPoint={currentPoint!}
                  partnerPoints={partnerPoints}
                />
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  Need at least a few days of data to see your balance chart.
                </p>
              )}
            </CardContent>
          </Card>
        </PremiumGate>
      </TabsContent>

      <TabsContent value="optimizer" className="space-y-4">
        {/* Pareto frontier scatter plot */}
        {historicalPoints.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Life vs. Relationship Score History</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    type="number"
                    dataKey="lifeScore"
                    name="Life"
                    domain={[0, 100]}
                    tick={{ fill: "#999", fontSize: 11 }}
                    label={{ value: "Life Score", position: "insideBottom", offset: -2, fill: "#999", fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="relScore"
                    name="Rel"
                    domain={[0, 100]}
                    tick={{ fill: "#999", fontSize: 11 }}
                    label={{ value: "Rel Score", angle: -90, position: "insideLeft", fill: "#999", fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ backgroundColor: "#1c1c1c", border: "1px solid #333", borderRadius: 8 }}
                    formatter={(v: unknown) => typeof v === "number" ? v.toFixed(1) : String(v)}
                  />
                  {/* Historical points */}
                  <Scatter
                    name="History"
                    data={historicalPoints}
                    fill="#6b7280"
                    opacity={0.5}
                    r={4}
                  />
                  {/* Frontier points */}
                  <Scatter
                    name="Frontier"
                    data={frontierPoints}
                    fill="#fbbf24"
                    r={6}
                  />
                  {/* Current point */}
                  {currentPoint && (
                    <Scatter
                      name="Today"
                      data={[currentPoint]}
                      fill="#ef4444"
                      r={8}
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-500 opacity-60" />Historical</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />Frontier best</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />Today</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pareto frontier status */}
        {paretoAnalysis ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MapPin className={`h-4 w-4 ${paretoAnalysis.isOnFrontier ? "text-emerald-400" : "text-amber-400"}`} />
                <CardTitle className="text-base">
                  Pareto Frontier Status
                  <InfoTooltip text="The Pareto frontier shows the best combinations of Life Score and Relationship Score you've ever achieved. If you're 'below the frontier', it means you've been in a better overall state before — the suggestions below show which areas to focus on to get back there." />
                </CardTitle>
                <Badge variant={paretoAnalysis.isOnFrontier ? "secondary" : "default"} className="ml-auto">
                  {paretoAnalysis.isOnFrontier ? "On Frontier" : "Below Frontier"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {paretoAnalysis.isOnFrontier ? (
                <p className="text-sm text-emerald-400">
                  You are on your Pareto frontier — today&apos;s state is among your historical best. Keep it up!
                </p>
              ) : (
                <>
                  <p className="text-sm">
                    You are <span className="font-medium">{paretoAnalysis.distanceFromFrontier.toFixed(1)} points</span> below
                    your historical frontier. Your past best was Life{" "}
                    <span className="font-mono font-medium text-blue-400">
                      {paretoAnalysis.nearestFrontierPoint?.lifeScore.toFixed(1)}
                    </span>{" "}
                    / Rel{" "}
                    <span className="font-mono font-medium text-pink-400">
                      {paretoAnalysis.nearestFrontierPoint?.relScore.toFixed(1)}
                    </span>
                    .
                  </p>
                  <div className="flex gap-4 text-sm">
                    {paretoAnalysis.lifeScoreGap > 0 && (
                      <span className="text-muted-foreground">
                        Life gap: <span className="font-mono text-blue-400">+{paretoAnalysis.lifeScoreGap}</span>
                      </span>
                    )}
                    {paretoAnalysis.relScoreGap > 0 && (
                      <span className="text-muted-foreground">
                        Rel gap: <span className="font-mono text-pink-400">+{paretoAnalysis.relScoreGap}</span>
                      </span>
                    )}
                  </div>
                  {paretoAnalysis.laggingDimensions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">Lagging dimensions:</span>
                      {paretoAnalysis.laggingDimensions.map((dim) => (
                        <Badge key={dim} variant="outline" className="text-xs capitalize">{dim}</Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              Log more days to enable Pareto frontier analysis.
            </CardContent>
          </Card>
        )}

        {/* Optimizer result */}
        {optimizerResult ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <CardTitle className="text-base">
                  Nelder-Mead Optimizer
                  <InfoTooltip text="The optimizer analyzes your current dimension values and weights to find the combination of focus areas that would most improve your Total Quality score. The recommended allocations show how much relative effort to put into each area." />
                </CardTitle>
                <Badge
                  variant={optimizerResult.gainFromOptimization > 1 ? "default" : "secondary"}
                  className="ml-auto"
                >
                  {optimizerResult.gainFromOptimization > 0
                    ? `+${optimizerResult.gainFromOptimization.toFixed(1)} pts`
                    : "Optimal"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  Current quality:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {optimizerResult.currentTotalQuality.toFixed(1)}
                  </span>
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-muted-foreground">
                  Predicted:{" "}
                  <span className="font-mono font-medium text-emerald-400">
                    {optimizerResult.predictedScores.totalQuality.toFixed(1)}
                  </span>
                </span>
              </div>

              {optimizerResult.gainFromOptimization > 0.5 && (
                <>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground">Suggested focus allocations (0–10 scale):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(optimizerResult.recommendedAllocations).map(([dim, val]) => (
                      <div key={dim} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                        <span className="capitalize text-muted-foreground">{dim}</span>
                        <span className="font-mono font-medium">{val.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {optimizerResult.tradeoffs.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground">Tradeoffs:</p>
                  <ul className="space-y-1">
                    {optimizerResult.tradeoffs.map((t, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        • {t}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              Log your daily scores to run the optimizer.
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="trends" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Life Pillar Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#999", fontSize: 12 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis domain={[0, 10]} tick={{ fill: "#999", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1c1c1c",
                      border: "1px solid #333",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  {Object.entries(PILLAR_COLORS).map(([key, color]) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                Log for multiple days to see trends.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relationship Dimension Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#999", fontSize: 12 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis domain={[0, 10]} tick={{ fill: "#999", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1c1c1c",
                      border: "1px solid #333",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  {Object.entries(REL_COLORS).map(([key, color]) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                Log for multiple days to see trends.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
