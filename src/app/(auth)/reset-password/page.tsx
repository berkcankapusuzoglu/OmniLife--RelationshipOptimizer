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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { resetPasswordAction } from "@/lib/auth/reset-actions";
import { PasswordInput } from "../password-input";
import { FormError } from "../form-error";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, formAction, isPending] = useActionState(
    async (
      _prev: { error?: string } | undefined,
      formData: FormData
    ) => {
      return await resetPasswordAction(formData);
    },
    undefined
  );

  if (!token) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Invalid link</CardTitle>
          <CardDescription>
            This password reset link is missing or malformed.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/forgot-password" className="w-full">
            <Button variant="outline" className="w-full">
              Request a new link
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Must be at least 8 characters.</CardDescription>
      </CardHeader>
      <form action={formAction} aria-busy={isPending}>
        <input type="hidden" name="token" value={token} />
        <CardContent className="flex flex-col gap-4">
          <FormError id="reset-error" error={state?.error} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              minLength={8}
              aria-invalid={state?.error ? true : undefined}
              aria-describedby={state?.error ? "reset-error" : undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput
              id="confirm"
              name="confirm"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              minLength={8}
              aria-invalid={state?.error ? true : undefined}
              aria-describedby={state?.error ? "reset-error" : undefined}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving..." : "Reset password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
