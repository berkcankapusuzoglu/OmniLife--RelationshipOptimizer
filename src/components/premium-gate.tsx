"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import Link from "next/link";

interface PremiumGateProps {
  children: React.ReactNode;
  isPremium: boolean;
  feature?: string;
}

export function PremiumGate({ children, isPremium, feature }: PremiumGateProps) {
  if (isPremium) return <>{children}</>;

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none select-none opacity-20 blur-sm">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px]">
        <Lock className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="mb-1 text-sm font-medium">Premium Feature</p>
        {feature && (
          <p className="mb-3 text-xs text-muted-foreground">{feature}</p>
        )}
        <Button size="sm" render={<Link href="/settings" />}>
          Upgrade
        </Button>
      </div>
    </Card>
  );
}
