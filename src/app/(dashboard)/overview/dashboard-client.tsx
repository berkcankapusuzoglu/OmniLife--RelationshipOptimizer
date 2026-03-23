"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Heart,
  Brain,
  Calendar,
  Sparkles,
  Flame,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { InteractiveRadar } from "@/components/charts/InteractiveRadar";
import { TrendSparkline } from "@/components/charts/TrendSparkline";
import { ShareScore } from "@/components/share-score";
import type { PillarScores, RelDimScores } from "@/lib/engine/types";
import type { CrisisAlert } from "@/lib/engine/alerts";
import { HelpTip } from "@/components/help-tip";

interface DashboardClientProps {
  currentScores: {
    pillars: PillarScores;
    relDims: RelDimScores;
  } | null;
  latestScore: {
    lifeScore: number;
    relScore: number;
    totalQuality: number;
    penaltyApplied: number;
  } | null;
  scoreTrends: {
    date: string;
    lifeScore: number;
    relScore: number;
    totalQuality: number;
  }[];
  userName: string;
  currentStreak: number;
  longestStreak: number;
  trendAlerts?: { dimension: string; message: string }[];
  crisisAlerts?: CrisisAlert[];
}

function ScoreCard({
  title,
  value,
  trend,
  icon,
  color,
  helpText,
}: {
  title: string;
  value: number | null;
  trend?: number[];
  icon: React.ReactNode;
  color: string;
  helpText?: string;
}) {
  const trendDirection =
    trend && trend.length >= 2
      ? trend[trend.length - 1] - trend[trend.length - 2]
      : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          {title}
          {helpText && <HelpTip text={helpText} />}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <span className={`font-mono text-3xl font-bold ${color}`}>
            {value !== null ? value.toFixed(1) : "—"}
          </span>
          {trendDirection !== 0 && (
            <Badge
              variant={trendDirection > 0 ? "default" : "destructive"}
              className="mb-1"
            >
              {trendDirection > 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {Math.abs(trendDirection).toFixed(1)}
            </Badge>
          )}
        </div>
        {trend && trend.length > 1 && (
          <div className="mt-2">
            <TrendSparkline data={trend} height={32} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardClient({
  currentScores,
  latestScore,
  scoreTrends,
  userName,
  currentStreak,
  longestStreak,
  trendAlerts = [],
  crisisAlerts = [],
}: DashboardClientProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      // Remove param from URL without reload
      window.history.replaceState({}, "", "/");
      // Simple toast-style notification
      const toast = document.createElement("div");
      toast.className =
        "fixed top-4 right-4 z-50 rounded-lg bg-green-600 px-4 py-3 text-white shadow-lg animate-in fade-in slide-in-from-top-2";
      toast.textContent = "Welcome to Premium! Your upgrade was successful.";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    }
  }, [searchParams]);

  const defaultScores = {
    pillars: { vitality: 5, growth: 5, security: 5, connection: 5 },
    relDims: {
      emotional: 5,
      trust: 5,
      fairness: 5,
      stress: 5,
      autonomy: 5,
    },
  };

  const displayScores = currentScores ?? defaultScores;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your relationship dashboard
          </p>
        </div>
        <div className="hidden gap-2 md:flex">
          <Button render={<Link href="/daily" />}>
            <Calendar className="mr-2 h-4 w-4" />
            Log Today
          </Button>
          <Button variant="outline" render={<Link href="/exercises" />}>
            <Sparkles className="mr-2 h-4 w-4" />
            Exercise
          </Button>
          {latestScore && currentScores && (
            <ShareScore
              totalQuality={latestScore.totalQuality}
              lifeScore={latestScore.lifeScore}
              relScore={latestScore.relScore}
              date={new Date().toISOString().split("T")[0]}
              streak={currentStreak}
              pillars={currentScores.pillars}
              relDims={currentScores.relDims}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ScoreCard
          title="Life Score"
          value={latestScore?.lifeScore ?? null}
          trend={scoreTrends.map((s) => s.lifeScore)}
          icon={<Brain className="h-4 w-4 text-muted-foreground" />}
          color="text-blue-400"
          helpText="Average of vitality, growth, security, and connection — how you're doing personally."
        />
        <ScoreCard
          title="Relationship Score"
          value={latestScore?.relScore ?? null}
          trend={scoreTrends.map((s) => s.relScore)}
          icon={<Heart className="h-4 w-4 text-muted-foreground" />}
          color="text-rose-400"
          helpText="Average of emotional bond, trust, fairness, stress management, and personal space."
        />
        <ScoreCard
          title="Overall Score"
          value={latestScore?.totalQuality ?? null}
          trend={scoreTrends.map((s) => s.totalQuality)}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          color="text-emerald-400"
          helpText="Combined life + relationship health. Adjusts down if any area is very low or unbalanced."
        />
      </div>

      {currentStreak > 0 && (
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
              <Flame className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {currentStreak} day streak!
              </p>
              <p className="text-xs text-muted-foreground">
                Longest: {longestStreak} days
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {crisisAlerts.length > 0 && (
        <div className="space-y-2">
          {crisisAlerts.map((alert, i) => (
            <Card key={i} className="border-destructive bg-destructive/5">
              <CardContent className="flex items-start gap-3 py-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {trendAlerts.length > 0 && crisisAlerts.length === 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium">Declining trends detected</p>
              <ul className="mt-1 space-y-0.5">
                {trendAlerts.map((alert) => (
                  <li key={alert.dimension} className="text-xs text-muted-foreground">
                    {alert.message}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Life & Relationship Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <InteractiveRadar
                currentScores={displayScores}
                interactive={false}
              />
            </div>
            {!currentScores && (
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Log your first day to see your radar
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button
              variant="outline"
              className="h-auto justify-start py-3"
              render={<Link href="/daily" />}
            >
              <Calendar className="mr-3 h-5 w-5 text-blue-400" />
              <div className="text-left">
                <div className="font-medium">Daily Log</div>
                <div className="text-xs text-muted-foreground">
                  Track your 9 life dimensions
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start py-3"
              render={<Link href="/weekly" />}
            >
              <Calendar className="mr-3 h-5 w-5 text-rose-400" />
              <div className="text-left">
                <div className="font-medium">Weekly Check-in</div>
                <div className="text-xs text-muted-foreground">
                  Reflect on your week
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start py-3"
              render={<Link href="/scenarios" />}
            >
              <Sparkles className="mr-3 h-5 w-5 text-emerald-400" />
              <div className="text-left">
                <div className="font-medium">Switch Scenario</div>
                <div className="text-xs text-muted-foreground">
                  Adapt weights to your situation
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start py-3"
              render={<Link href="/insights" />}
            >
              <TrendingUp className="mr-3 h-5 w-5 text-amber-400" />
              <div className="text-left">
                <div className="font-medium">View Insights</div>
                <div className="text-xs text-muted-foreground">
                  Insights & recommendations
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
      {/* Mobile bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur-sm md:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <Button render={<Link href="/daily" />} className="mb-2 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-base font-semibold hover:from-purple-500 hover:to-pink-500">
          <Calendar className="mr-2 h-5 w-5" />
          Log Today
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/exercises" />} className="flex-1">
            <Sparkles className="mr-2 h-4 w-4" />
            Exercise
          </Button>
          {latestScore && currentScores ? (
            <ShareScore
              totalQuality={latestScore.totalQuality}
              lifeScore={latestScore.lifeScore}
              relScore={latestScore.relScore}
              date={new Date().toISOString().split("T")[0]}
              streak={currentStreak}
              pillars={currentScores.pillars}
              relDims={currentScores.relDims}
            />
          ) : (
            <Button variant="outline" className="flex-1" disabled>
              Share
            </Button>
          )}
        </div>
      </div>
      {/* Spacer for mobile bottom bar */}
      <div className="h-32 md:hidden" />
    </div>
  );
}
