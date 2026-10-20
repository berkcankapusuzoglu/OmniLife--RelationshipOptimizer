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
import { PasswordInput } from "../password-input";
import { FormError } from "../form-error";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const fromName = searchParams.get("from");
  const ref = searchParams.get("ref");

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await registerAction(formData);
    },
    undefined
  );
  const invalid = state?.error ? true : undefined;
  const describedBy = state?.error ? "register-error" : undefined;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Create account</CardTitle>
        <CardDescription>
          {fromName
            ? `${fromName} invited you to optimize your relationship together`
            : ref
              ? "Your friend invited you — sign up to get started"
              : "Sign up to start optimizing your relationship"}
        </CardDescription>
      </CardHeader>
      <form action={formAction} aria-busy={isPending}>
        {inviteCode && (
          <input type="hidden" name="invite" value={inviteCode} />
        )}
        {ref && <input type="hidden" name="ref" value={ref} />}
        <CardContent className="flex flex-col gap-4">
          {fromName && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
              <Heart className="h-4 w-4 text-rose-400 shrink-0" />
              <p className="text-sm text-muted-foreground">
                After signing up, review {fromName}&apos;s invitation before
                choosing to link accounts.
              </p>
            </div>
          )}
          <FormError id="register-error" error={state?.error} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              autoComplete="given-name"
              required
              minLength={1}
              maxLength={100}
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              required
              maxLength={254}
              autoComplete="email"
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              minLength={8}
              aria-invalid={invalid}
              aria-describedby={state?.error ? "register-error password-rules" : "password-rules"}
            />
            <p id="password-rules" className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? "Creating account..."
              : fromName
                ? `Join ${fromName} on Couplemetric`
                : "Create account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href={inviteCode ? `/login?invite=${encodeURIComponent(inviteCode)}` : "/login"} className="font-medium text-primary underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
