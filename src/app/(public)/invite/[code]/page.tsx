import { getDb } from "@/lib/db";
import { users, scores } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { InviteClient } from "./invite-client";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;

  let firstName = "Someone";
  try {
    const db = getDb();
    const [inviter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.partnerInviteCode, code.toUpperCase()))
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

export default async function InvitePage({ params }: Props) {
  const { code } = await params;

  let inviter: { id: string; name: string | null } | undefined;
  try {
    const db = getDb();
    const [result] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.partnerInviteCode, code.toUpperCase()))
      .limit(1);
    inviter = result;
  } catch {
    // DB unavailable — treat as invalid invite
  }

  if (!inviter) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto max-w-md text-center space-y-4">
          <h1 className="text-2xl font-medium">Invalid or Expired Invite</h1>
          <p className="text-muted-foreground">
            This invite link is no longer valid or has expired. Ask your partner
            to generate a new invite link from their settings.
          </p>
        </div>
      </div>
    );
  }

  // If logged in, auto-link and redirect
  try {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      const db = getDb();
      if (!currentUser.partnerId && currentUser.id !== inviter.id) {
        await db
          .update(users)
          .set({ partnerId: inviter.id })
          .where(eq(users.id, currentUser.id));
        await db
          .update(users)
          .set({ partnerId: currentUser.id })
          .where(eq(users.id, inviter.id));
      }
      redirect("/overview?linked=true");
    }
  } catch (e) {
    // redirect() throws a special error — rethrow it
    if (e instanceof Error && e.message?.includes("NEXT_REDIRECT")) throw e;
    // Otherwise DB/auth failure — continue to show invite page
  }

  const firstName = inviter.name?.split(" ")[0] ?? "Someone";

  // Get inviter's latest score for the challenge card
  let inviterScore: number | null = null;
  try {
    const db = getDb();
    const [latestScore] = await db
      .select({ totalQuality: scores.totalQuality })
      .from(scores)
      .where(eq(scores.userId, inviter.id))
      .orderBy(desc(scores.createdAt))
      .limit(1);
    inviterScore = latestScore ? Number(latestScore.totalQuality) : null;
  } catch {
    // DB unavailable — show page without score
  }

  return (
    <InviteClient
      firstName={firstName}
      code={code.toUpperCase()}
      inviterScore={inviterScore}
    />
  );
}
