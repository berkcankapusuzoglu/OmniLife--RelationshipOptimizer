"use client";

import { ShareableScoreCard } from "@/components/score-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ShareResultClientProps {
  totalQuality: number;
  lifeScore: number;
  relScore: number;
  date: string;
  pillars?: {
    vitality: number;
    growth: number;
    security: number;
    connection: number;
  };
  relDims?: {
    emotional: number;
    trust: number;
    fairness: number;
    stress: number;
    autonomy: number;
  };
}

export function ShareResultClient(props: ShareResultClientProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-[540px]">
        <ShareableScoreCard
          totalQuality={props.totalQuality}
          lifeScore={props.lifeScore}
          relScore={props.relScore}
          pillars={props.pillars}
          relDims={props.relDims}
          date={props.date}
        />

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-center text-sm text-muted-foreground">
            Want to know your relationship score?
          </p>
          <Button
            className="w-full max-w-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
            render={<Link href="/register" />}
          >
            Take the Free Quiz
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Already have an account? Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}
