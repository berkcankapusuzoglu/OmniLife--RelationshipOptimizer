"use server";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { requireAuth } from "@/lib/auth/guard";
import { inviteInput } from "@/lib/auth/action-inputs";
import { claimPartnerInvite } from "@/lib/auth/authorization";

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
  if (user.partnerId) return;
  await claimPartnerInvite(user.id, inviteCode);

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
