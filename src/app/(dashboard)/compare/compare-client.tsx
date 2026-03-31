"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PremiumGate } from "@/components/premium-gate";
import {
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ── Types ───────────────────────────────────────────────────────────────────

interface ScoreEntry {
  date: string;
  lifeScore: number;
  relScore: number;
  totalQuality: number;
}

interface LogEntry {
  date: string;
  vitalityScore: number;
  growthScore: number;
  securityScore: number;
  connectionScore: number;
  emotionalScore: number;
  trustScore: number;
  fairnessScore: number;
  stressScore: number;
  autonomyScore: number;
}

interface CompareClientProps {
  userName: string;
  partnerName: string;
  myScores: ScoreEntry[];
  myLogs: LogEntry[];
  partnerScores: ScoreEntry[];
  partnerLogs: LogEntry[];
  userTier: string;
}

// ── Dimension metadata ──────────────────────────────────────────────────────

const DIMENSIONS = [
  { key: "vitalityScore", label: "Vitality", category: "life" },
  { key: "growthScore", label: "Growth", category: "life" },
  { key: "securityScore", label: "Security", category: "life" },
  { key: "connectionScore", label: "Connection", category: "life" },
  { key: "emotionalScore", label: "Emotional", category: "rel" },
  { key: "trustScore", label: "Trust", category: "rel" },
  { key: "fairnessScore", label: "Fairness", category: "rel" },
  { key: "stressScore", label: "Stress", category: "rel" },
  { key: "autonomyScore", label: "Personal Space", category: "rel" },
] as const;

type DimKey = (typeof DIMENSIONS)[number]["key"];

// ── Insight generators ──────────────────────────────────────────────────────

function gapInsight(dim: string, myVal: number, partnerVal: number): string {
  const gap = myVal - partnerVal;
  const absGap = Math.abs(gap);
  const higher = gap > 0 ? "You" : "Your partner";
  const lower = gap > 0 ? "your partner" : "you";

  const insights: Record<string, string> = {
    vitalityScore:
      absGap <= 1
        ? "Well aligned on physical wellbeing"
        : `${higher} report${gap > 0 ? "" : "s"} higher vitality -- check if ${lower} need${gap > 0 ? "s" : ""} more rest or exercise`,
    growthScore:
      absGap <= 1
        ? "Both feel similarly about personal growth"
        : `${higher} feel${gap > 0 ? "" : "s"} more growth -- explore shared learning goals`,
    securityScore:
      absGap <= 1
        ? "Financial/career security perceptions match"
        : `${higher} feel${gap > 0 ? "" : "s"} more secure -- discuss what drives the difference`,
    connectionScore:
      absGap <= 1
        ? "Both feel connected at a similar level"
        : `${higher} feel${gap > 0 ? "" : "s"} more connected -- ${lower} may need more quality time`,
    emotionalScore:
      absGap <= 1
        ? "Emotional availability is balanced"
        : `${higher} feel${gap > 0 ? "" : "s"} more emotional support -- talk about what would help`,
    trustScore:
      absGap <= 1
        ? "Trust levels are well matched"
        : `Trust gap detected -- this is worth a gentle, honest conversation`,
    fairnessScore:
      absGap <= 1
        ? "Perceived fairness is balanced"
        : `${lower} may feel things are unfair -- review how responsibilities are shared`,
    stressScore:
      absGap <= 1
        ? "Stress levels are similar"
        : `${higher} report${gap > 0 ? "" : "s"} more stress -- discuss what is causing this`,
    autonomyScore:
      absGap <= 1
        ? "Both feel similarly about personal space"
        : `${higher} feel${gap > 0 ? "" : "s"} more autonomous -- ${lower} may want more independence`,
  };

  return insights[dim] ?? "Review this dimension together";
}

function conversationPrompts(
  gaps: { dim: string; label: string; gap: number }[]
): { prompt: string; context: string }[] {
  const sorted = [...gaps].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  const top = sorted.slice(0, 5).filter((g) => Math.abs(g.gap) >= 1);

  const promptMap: Record<string, (gap: number) => string> = {
    fairnessScore: (g) =>
      `Your fairness scores differ by ${Math.abs(g)} points. Try asking: "Are there any tasks you feel are unfairly distributed?"`,
    stressScore: (g) =>
      `Stress scores differ by ${Math.abs(g)} points. Try: "What is your biggest source of stress right now, and how can I help?"`,
    emotionalScore: (g) =>
      `Emotional scores differ by ${Math.abs(g)} points. Try: "Do you feel emotionally supported by me? What could I do better?"`,
    trustScore: (g) =>
      `Trust scores differ by ${Math.abs(g)} points. Try: "Is there anything on your mind that you have been hesitant to share?"`,
    connectionScore: (g) =>
      `Connection scores differ by ${Math.abs(g)} points. Try: "When did you last feel really close to me? What made that special?"`,
    autonomyScore: (g) =>
      `Autonomy scores differ by ${Math.abs(g)} points. Try: "Do you feel you have enough time and space for yourself?"`,
    vitalityScore: (g) =>
      `Vitality scores differ by ${Math.abs(g)} points. Try: "How are you feeling physically? Should we adjust our routines?"`,
    growthScore: (g) =>
      `Growth scores differ by ${Math.abs(g)} points. Try: "Is there something you would like to learn or explore together?"`,
    securityScore: (g) =>
      `Security scores differ by ${Math.abs(g)} points. Try: "Do you feel secure about our future? What worries you?"`,
  };

  return top.map((g) => ({
    prompt:
      promptMap[g.dim]?.(g.gap) ??
      `${g.label} scores differ by ${Math.abs(g.gap)} points. Discuss what is driving this.`,
    context:
      g.gap > 0
        ? `You scored higher by ${g.gap}`
        : `Your partner scored higher by ${Math.abs(g.gap)}`,
  }));
}

// ── Color helpers ───────────────────────────────────────────────────────────

function gapColor(gap: number): string {
  const abs = Math.abs(gap);
  if (abs <= 1) return "text-emerald-400";
  if (abs <= 2) return "text-amber-400";
  return "text-red-400";
}

function scoreGapColor(gap: number): string {
  if (gap <= 10) return "text-emerald-400";
  if (gap <= 20) return "text-amber-400";
  return "text-red-400";
}

// ── Component ───────────────────────────────────────────────────────────────

export function CompareClient({
  userName,
  partnerName,
  myScores,
  myLogs,
  partnerScores,
  partnerLogs,
  userTier,
}: CompareClientProps) {
  const [trendMetric, setTrendMetric] = useState<
    "totalQuality" | "lifeScore" | "relScore"
  >("totalQuality");

  const myLatestScore = myScores[0] ?? null;
  const partnerLatestScore = partnerScores[0] ?? null;
  const myLatestLog = myLogs[0] ?? null;
  const partnerLatestLog = partnerLogs[0] ?? null;

  const hasData = myLatestLog && partnerLatestLog;

  // Build gap analysis
  const gapData = hasData
    ? DIMENSIONS.map((d) => {
        const myVal = myLatestLog[d.key];
        const pVal = partnerLatestLog[d.key];
        return {
          dim: d.key,
          label: d.label,
          category: d.category,
          myVal,
          partnerVal: pVal,
          gap: myVal - pVal,
          insight: gapInsight(d.key, myVal, pVal),
        };
      }).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    : [];

  // Radar chart data
  const radarData = hasData
    ? DIMENSIONS.map((d) => ({
        dimension: d.label,
        [userName]: myLatestLog[d.key],
        [partnerName]: partnerLatestLog[d.key],
      }))
    : [];

  // Trend data (merge by date)
  const trendMap = new Map<
    string,
    { date: string; you?: number; partner?: number }
  >();
  for (const s of [...myScores].reverse()) {
    trendMap.set(s.date, {
      date: s.date,
      you: s[trendMetric],
      partner: trendMap.get(s.date)?.partner,
    });
  }
  for (const s of [...partnerScores].reverse()) {
    const existing = trendMap.get(s.date);
    trendMap.set(s.date, {
      date: s.date,
      you: existing?.you,
      partner: s[trendMetric],
    });
  }
  const trendData = Array.from(trendMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Conversation prompts
  const prompts = conversationPrompts(gapData);

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Both you and your partner need at least one daily log to compare.
            Keep logging!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Score Overview ──────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <ScoreCard
          name={userName}
          label="You"
          score={myLatestScore}
          color="text-purple-400"
        />
        <ScoreCard
          name={partnerName}
          label="Partner"
          score={partnerLatestScore}
          color="text-teal-400"
        />
      </div>

      {/* Score gap summary */}
      {myLatestScore && partnerLatestScore && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-center gap-6 py-4">
            {(
              [
                ["Overall Score", "totalQuality"],
                ["Life Score", "lifeScore"],
                ["Rel Score", "relScore"],
              ] as const
            ).map(([label, key]) => {
              const gap = Math.abs(
                (myLatestScore[key] ?? 0) - (partnerLatestScore[key] ?? 0)
              );
              return (
                <div key={key} className="text-center">
                  <p className="text-xs text-muted-foreground">{label} Gap</p>
                  <p
                    className={`text-lg font-bold ${scoreGapColor(gap)}`}
                  >
                    {gap.toFixed(1)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Radar Chart ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dimension Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                    const item = radarData.find((d) => d.dimension === payload.value);
                    const myVal = item ? (item[userName] as number) : null;
                    const pVal = item ? (item[partnerName] as number) : null;
                    return (
                      <g>
                        <text x={x} y={y - 4} textAnchor="middle" fill="#e2e8f0" fontSize={11} fontWeight={500}>
                          {payload.value}
                        </text>
                        {myVal !== null && pVal !== null && (
                          <text x={x} y={y + 10} textAnchor="middle" fontSize={9} fill="#94a3b8">
                            {myVal} / {pVal}
                          </text>
                        )}
                      </g>
                    );
                  }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 10]}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickCount={6}
                />
                <Radar
                  name={userName}
                  dataKey={userName}
                  stroke="#a78bfa"
                  fill="#a78bfa"
                  fillOpacity={0.2}
                />
                <Radar
                  name={partnerName}
                  dataKey={partnerName}
                  stroke="#2dd4bf"
                  fill="#2dd4bf"
                  fillOpacity={0.2}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [value.toFixed(1), name]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Gap Analysis Table ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpDown className="h-4 w-4" />
            Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Dimension</th>
                  <th className="pb-2 pr-4 text-right">You</th>
                  <th className="pb-2 pr-4 text-right">Partner</th>
                  <th className="pb-2 pr-4 text-right">Gap</th>
                  <th className="pb-2">Insight</th>
                </tr>
              </thead>
              <tbody>
                {gapData.map((row) => (
                  <tr key={row.dim} className="border-b border-border/50">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        {row.label}
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {row.category === "life" ? "Life" : "Rel"}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-purple-400">
                      {row.myVal}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-teal-400">
                      {row.partnerVal}
                    </td>
                    <td
                      className={`py-2.5 pr-4 text-right font-bold ${gapColor(row.gap)}`}
                    >
                      {row.gap > 0 ? "+" : ""}
                      {row.gap}
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {row.insight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Trend Comparison (Premium) ─────────────────────────────────── */}
      <PremiumGate userTier={userTier} feature="insights">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trend Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              value={trendMetric}
              onValueChange={(v) =>
                setTrendMetric(
                  v as "totalQuality" | "lifeScore" | "relScore"
                )
              }
            >
              <TabsList>
                <TabsTrigger value="totalQuality">Overall Score</TabsTrigger>
                <TabsTrigger value="lifeScore">Life Score</TabsTrigger>
                <TabsTrigger value="relScore">Rel Score</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="you"
                    name={userName}
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="partner"
                    name={partnerName}
                    stroke="#2dd4bf"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </PremiumGate>

      {/* ── Communication Prompts ──────────────────────────────────────── */}
      {prompts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              Conversation Starters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prompts.map((p, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/50 bg-muted/30 p-3"
              >
                <p className="text-sm">{p.prompt}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.context}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ScoreCard({
  name,
  label,
  score,
  color,
}: {
  name: string;
  label: string;
  score: ScoreEntry | null;
  color: string;
}) {
  if (!score) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            {name} has no scores yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm ${color}`}>{name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <p className="text-3xl font-bold">{score.totalQuality.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Overall Score</p>
        </div>
        <div className="flex gap-4">
          <div>
            <p className="text-lg font-semibold">{score.lifeScore.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Life</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{score.relScore.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Relationship</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">{score.date}</p>
      </CardContent>
    </Card>
  );
}
