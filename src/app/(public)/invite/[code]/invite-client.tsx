"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Sparkles, Users } from "lucide-react";

export function InviteClient({
  firstName,
  code,
}: {
  firstName: string;
  code: string;
}) {
  const registerUrl = `/register?invite=${code}&from=${encodeURIComponent(firstName)}`;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background to-background/80">
      <div className="mx-auto max-w-md w-full space-y-6">
        {/* Branded invite card */}
        <Card className="overflow-hidden border-rose-500/20">
          <div className="bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10 p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-400/20">
              <Heart className="h-8 w-8 text-rose-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {firstName} wants to optimize your relationship together
              </h1>
              <p className="text-sm text-muted-foreground">
                on OmniLife — Relationship Optimizer
              </p>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Benefits */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-purple-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Couple Bonus Unlocked</p>
                  <p className="text-xs text-muted-foreground">
                    8 exercises, 14-day history, and couple comparison view
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 text-blue-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Shared Insights</p>
                  <p className="text-xs text-muted-foreground">
                    Track relationship health together with daily scores
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full text-base py-6"
              render={<Link href={registerUrl} />}
            >
              <Heart className="mr-2 h-5 w-5" />
              Create account to review invite
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href={`/login?invite=${code}`} className="text-primary hover:underline">
                Sign in
              </Link>{" "}
              to review and confirm this invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
