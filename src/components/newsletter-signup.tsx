"use client";

import { useActionState } from "react";
import { subscribeAction } from "@/app/(public)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type State = { success?: boolean; error?: string } | null;

export function NewsletterSignup({
  source,
  heading,
  description,
}: {
  source: string;
  heading?: string;
  description?: string;
}) {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      return subscribeAction(formData);
    },
    null,
  );

  if (state?.success) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <svg
          className="h-5 w-5 animate-in zoom-in duration-300"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        </svg>
        <span>You&apos;re in! Check your inbox.</span>
      </div>
    );
  }

  return (
    <div>
      {heading && (
        <h3 className="text-lg font-semibold mb-1">{heading}</h3>
      )}
      {description && (
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
      )}
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="source" value={source} />
        <Input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          className="flex-1 min-w-0"
        />
        <Button
          type="submit"
          disabled={isPending}
          className="shrink-0 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0"
        >
          {isPending ? "..." : "Subscribe"}
        </Button>
      </form>
      {state?.error && (
        <p className="mt-1.5 text-xs text-red-400">{state.error}</p>
      )}
    </div>
  );
}
