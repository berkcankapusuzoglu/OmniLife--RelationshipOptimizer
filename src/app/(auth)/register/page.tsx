"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { registerAction } from "@/lib/auth/actions";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const fromName = searchParams.get("from");

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await registerAction(formData);
    },
    undefined
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Create account</CardTitle>
        <CardDescription>
          {fromName
            ? `${fromName} invited you to optimize your relationship together`
            : "Sign up to start optimizing your relationship"}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        {inviteCode && (
          <input type="hidden" name="invite" value={inviteCode} />
        )}
        <CardContent className="flex flex-col gap-4">
          {fromName && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
              <Heart className="h-4 w-4 text-rose-400 shrink-0" />
              <p className="text-sm text-muted-foreground">
                You&apos;ll be automatically linked with {fromName} after
                signing up. Couple bonuses will be unlocked!
              </p>
            </div>
          )}
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? "Creating account..."
              : fromName
                ? `Join ${fromName} on OmniLife`
                : "Create account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
