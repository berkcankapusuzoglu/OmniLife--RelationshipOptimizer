"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TIERS } from "@/lib/subscription/tiers";
import Link from "next/link";
import { useNativePlatform } from "@/lib/capacitor/platform";

interface UpgradePromptProps {
  featureDescription: string;
  className?: string;
}

export function UpgradePrompt({
  featureDescription,
  className,
}: UpgradePromptProps) {
  const native = useNativePlatform();
  return (
    <Card
      className={`border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-violet-500/5 ${className ?? ""}`}
    >
      <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
          <Sparkles className="h-5 w-5 text-purple-400" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{featureDescription}</p>
          <p className="text-xs text-muted-foreground">
            {native === false ? "Unlock everything with Premium. One plan covers both partners." : "This feature is not available for your account."}
          </p>
        </div>
        {native === false && <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/pricing" />}
          >
            Compare Plans
          </Button>
          <Button
            size="sm"
            render={<Link href="/pricing" />}
            className="bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-500 hover:to-violet-500"
          >
            Upgrade — ${TIERS.premium.monthlyPrice}/mo
          </Button>
        </div>}
      </CardContent>
    </Card>
  );
}
