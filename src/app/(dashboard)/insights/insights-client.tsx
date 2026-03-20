"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";
import { ParetoChart } from "@/components/charts/ParetoChart";
import type { Recommendation } from "@/lib/engine/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
}

const PILLAR_COLORS: Record<string, string> = {
  vitality: "#60a5fa",
  growth: "#818cf8",
  security: "#a78bfa",
  connection: "#c084fc",
};

const REL_COLORS: Record<string, string> = {
  emotional: "#fb7185",
  trust: "#f472b6",
  fairness: "#e879f9",
  stress: "#c084fc",
  autonomy: "#a78bfa",
};

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
}: InsightsClientProps) {
  return (
    <Tabs defaultValue="recommendations" className="space-y-4">
      <TabsList>
        <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        <TabsTrigger value="pareto">Pareto Frontier</TabsTrigger>
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

      <TabsContent value="pareto">
        <Card>
          <CardHeader>
            <CardTitle>Pareto Frontier</CardTitle>
          </CardHeader>
          <CardContent>
            {historicalPoints.length > 0 ? (
              <ParetoChart
                historicalPoints={historicalPoints}
                frontierPoints={frontierPoints}
                currentPoint={currentPoint!}
              />
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                Need at least a few days of data to compute the Pareto frontier.
              </p>
            )}
          </CardContent>
        </Card>
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
