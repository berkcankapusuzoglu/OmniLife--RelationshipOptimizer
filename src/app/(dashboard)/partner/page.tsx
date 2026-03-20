import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PartnerClient } from "./partner-client";

export default async function PartnerPage() {
  const user = await requireAuth();
  const db = getDb();

  let partner = null;
  if (user.partnerId) {
    const [p] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, user.partnerId))
      .limit(1);
    partner = p ?? null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Partner</h1>
        <p className="text-sm text-muted-foreground">
          Link accounts to share tasks and insights
        </p>
      </div>
      <PartnerClient
        userId={user.id}
        inviteCode={user.partnerInviteCode}
        partner={partner}
      />
    </div>
  );
}
