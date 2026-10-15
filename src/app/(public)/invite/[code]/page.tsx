import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/guard";
import { InviteClient } from "./invite-client";
import type { Metadata } from "next";
import { inviteInput } from "@/lib/auth/action-inputs";
import { acceptPartnerInvite } from "./actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ error?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const parsed = inviteInput.safeParse(code);

  let firstName = "Someone";
  try {
    if (!parsed.success) throw new Error("Invalid invite");
    const db = getDb();
    const [inviter] = await db
      .select({ name: users.name })
      .from(users)
      .where(and(eq(users.partnerInviteCode, parsed.data), isNull(users.partnerId)))
      .limit(1);
    firstName = inviter?.name?.split(" ")[0] ?? "Someone";
  } catch {
    // DB unavailable — fall through with default name
  }

  return {
    title: `${firstName} invited you to OmniLife`,
    description: `${firstName} invited you to OmniLife — Optimize Your Relationship Together`,
    openGraph: {
      title: `${firstName} invited you to OmniLife`,
      description: `${firstName} invited you to OmniLife — Optimize Your Relationship Together`,
      type: "website",
    },
  };
}

function UnavailableInvite() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-medium">Invitation unavailable</h1>
        <p className="text-muted-foreground">This invitation cannot be accepted. Check your partner settings or ask for a new invitation.</p>
        <Link href="/partner" className="text-primary underline">Go to partner settings</Link>
      </div>
    </div>
  );
}

export default async function InvitePage({ params, searchParams }: Props) {
  const { code } = await params;
  const parsed = inviteInput.safeParse(code);
  if (!parsed.success) return <UnavailableInvite />;

  let inviter: { id: string; name: string | null } | undefined;
  let currentUser;
  try {
    const db = getDb();
    const [result] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.partnerInviteCode, parsed.data), isNull(users.partnerId)))
      .limit(1);
    inviter = result;
    currentUser = await getCurrentUser();
  } catch {
    return <UnavailableInvite />;
  }

  if (!inviter || (currentUser && (currentUser.partnerId || currentUser.id === inviter.id))) return <UnavailableInvite />;

  const firstName = inviter.name?.split(" ")[0] ?? "Someone";

  if (currentUser) {
    const error = (await searchParams)?.error;
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto w-full max-w-md space-y-5">
          <h1 className="text-2xl font-medium">Review partner invitation</h1>
          <p>{firstName} invited you to link accounts on OmniLife.</p>
          <p id="sharing-details" className="text-sm text-muted-foreground">Linking lets both of you see score and dimension histories, comparisons, and shared household tasks. Journal notes, standalone mood, and energy are not shared. You can unlink in partner settings.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error === "confirmation" ? "Please confirm you want to link accounts." : "The invitation could not be accepted. Please try again or ask for a new invitation."}</p>}
          <form action={acceptPartnerInvite} className="space-y-4">
            <input type="hidden" name="code" value={parsed.data} />
            <label className="flex items-start gap-3">
              <input type="checkbox" name="confirm" value="yes" required aria-describedby="sharing-details" className="mt-1" />
              <span>I agree to link my account with {firstName} and share this information.</span>
            </label>
            <Button type="submit" className="w-full">Confirm account link</Button>
            <Link href="/partner" className="block text-center text-sm underline">Cancel</Link>
          </form>
        </div>
      </main>
    );
  }

  return (
    <InviteClient
      firstName={firstName}
      code={parsed.data}
    />
  );
}
