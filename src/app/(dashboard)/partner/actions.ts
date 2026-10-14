"use server";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { requireAuth } from "@/lib/auth/guard";
import { inviteInput } from "@/lib/auth/action-inputs";

export async function generateInviteCode() {
  const user = await requireAuth();
  const db = getDb();
  const code = randomInt(36 ** 6).toString(36).padStart(6, "0").toUpperCase();

  await db
    .update(users)
    .set({ partnerInviteCode: code })
    .where(and(eq(users.id, user.id), isNull(users.partnerId)));

  revalidatePath("/partner");
}

export async function linkPartner(inviteCode: string) {
  const user = await requireAuth();
  inviteCode = inviteInput.parse(inviteCode);
  const db = getDb();
  if (user.partnerId) return;
  try {
    await db.transaction(async (tx) => {
      const [partner] = await tx.select({ id: users.id }).from(users)
        .where(and(eq(users.partnerInviteCode, inviteCode), isNull(users.partnerId))).limit(1);
      if (!partner || partner.id === user.id) return;
      const claimed = await tx.update(users).set({ partnerId: user.id, partnerInviteCode: null })
        .where(and(eq(users.id, partner.id), eq(users.partnerInviteCode, inviteCode), isNull(users.partnerId)))
        .returning({ id: users.id });
      if (!claimed.length) throw new Error("Partner link unavailable");
      const linked = await tx.update(users).set({ partnerId: partner.id, partnerInviteCode: null })
        .where(and(eq(users.id, user.id), isNull(users.partnerId))).returning({ id: users.id });
      if (!linked.length) throw new Error("Partner link unavailable");
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Partner link unavailable") throw error;
    return;
  }

  revalidatePath("/partner");
}

export async function unlinkPartner() {
  const user = await requireAuth();
  const db = getDb();
  const partnerId = user.partnerId;
  if (!partnerId) return;
  await db.transaction(async (tx) => {
    const removed = await tx.update(users).set({ partnerId: null, partnerInviteCode: null })
      .where(and(eq(users.id, user.id), eq(users.partnerId, partnerId))).returning({ id: users.id });
    if (!removed.length) return;
    await tx.update(users).set({ partnerId: null, partnerInviteCode: null })
      .where(and(eq(users.id, partnerId), eq(users.partnerId, user.id)));
  });

  revalidatePath("/partner");
}
