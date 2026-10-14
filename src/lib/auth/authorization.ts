import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { inviteInput } from "./action-inputs";

class InviteClaimConflict extends Error {}

// Internal DAL operation: callers supply a verified session user or the ID
// returned by account creation, never a browser-supplied actor.
export async function claimPartnerInvite(actorId: string, inviteCode: string): Promise<boolean> {
  const parsed = inviteInput.safeParse(inviteCode);
  if (!parsed.success) return false;
  const code = parsed.data;
  try {
    return await getDb().transaction(async (tx) => {
      const [partner] = await tx.select({ id: users.id }).from(users)
        .where(and(eq(users.partnerInviteCode, code), isNull(users.partnerId))).limit(1);
      if (!partner || partner.id === actorId) return false;

      const claimed = await tx.update(users).set({ partnerId: actorId, partnerInviteCode: null })
        .where(and(eq(users.id, partner.id), eq(users.partnerInviteCode, code), isNull(users.partnerId)))
        .returning({ id: users.id });
      if (!claimed.length) return false;

      const linked = await tx.update(users).set({ partnerId: partner.id, partnerInviteCode: null })
        .where(and(eq(users.id, actorId), isNull(users.partnerId))).returning({ id: users.id });
      if (!linked.length) throw new InviteClaimConflict();
      return true;
    });
  } catch (error) {
    if (!(error instanceof InviteClaimConflict)) throw error;
    return false;
  }
}

export async function linkedPartnerId(user: { id: string; partnerId: string | null }) {
  if (!user.partnerId) return null;
  const [partner] = await getDb().select({ id: users.id }).from(users)
    .where(and(eq(users.id, user.partnerId), eq(users.partnerId, user.id))).limit(1);
  return partner?.id ?? null;
}
