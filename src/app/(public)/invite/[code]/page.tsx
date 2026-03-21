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
  const db = getDb();

  const [inviter] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.partnerInviteCode, code.toUpperCase()))
    .limit(1);

  const firstName = inviter?.name?.split(" ")[0] ?? "Someone";

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
  const db = getDb();

  const [inviter] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.partnerInviteCode, code.toUpperCase()))
    .limit(1);

  if (!inviter) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto max-w-md text-center space-y-4">
          <h1 className="text-2xl font-medium">Invalid Invite</h1>
          <p className="text-muted-foreground">
            This invite link is no longer valid or has expired.
          </p>
        </div>
      </div>
    );
  }

  // If logged in, auto-link and redirect
  const currentUser = await getCurrentUser();
  if (currentUser) {
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

  const firstName = inviter.name?.split(" ")[0] ?? "Someone";

  // Get inviter's latest score for the challenge card
  const [latestScore] = await db
    .select({ totalQuality: scores.totalQuality })
    .from(scores)
    .where(eq(scores.userId, inviter.id))
    .orderBy(desc(scores.createdAt))
    .limit(1);

  return (
    <InviteClient
      firstName={firstName}
      code={code.toUpperCase()}
      inviterScore={latestScore ? Number(latestScore.totalQuality) : null}
    />
  );
}
