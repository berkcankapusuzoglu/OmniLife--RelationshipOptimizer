"use client";

import { useActionState } from "react";
import Link from "next/link";
import { deleteAccountAction } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountClient() {
  const [state, action, pending] = useActionState(deleteAccountAction, {});
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This permanently deletes your account, daily logs, scores, check-ins, coaching conversations,
        scenarios, constraints, recommendations, tasks you created, and account-associated referral
        and mailing-list records. Your partner keeps their own account and data; your link and shared sync events are removed.
        Export any data you want to keep before continuing.
      </p>
      <p className="text-sm text-muted-foreground">
        Stripe subscriptions are canceled during deletion. If you subscribed through Google Play,
        cancel that subscription in{" "}
        <a
          className="underline"
          href="https://play.google.com/store/account/subscriptions?package=app.couplemetric.android"
          target="_blank"
          rel="noopener noreferrer"
        >
          Play subscriptions
        </a>{" "}
        separately; deleting an account does not cancel store billing.
      </p>
      <div className="space-y-2">
        <Label htmlFor="deletion-password">Current password</Label>
        <Input id="deletion-password" name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={pending} />
        <Link className="text-sm underline" href="/forgot-password">Reset your password</Link>
      </div>
      <div className="space-y-2">
        <Label htmlFor="deletion-confirmation">Type DELETE to confirm</Label>
        <Input id="deletion-confirmation" name="confirmation" autoComplete="off" required pattern="DELETE" disabled={pending} />
      </div>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Deleting account…" : "Permanently delete my account"}
      </Button>
      <p className="text-sm"><Link href="/delete-account" className="underline">Deletion help and contact options</Link></p>
    </form>
  );
}
