"use server";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function generateInviteCode(userId: string) {
  const db = getDb();
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  await db
    .update(users)
    .set({ partnerInviteCode: code })
    .where(eq(users.id, userId));

  revalidatePath("/partner");
}

export async function linkPartner(userId: string, inviteCode: string) {
  const db = getDb();

  const [partner] = await db
    .select()
    .from(users)
    .where(eq(users.partnerInviteCode, inviteCode.toUpperCase()))
    .limit(1);

  if (!partner || partner.id === userId) return;

  await db
    .update(users)
    .set({ partnerId: partner.id })
    .where(eq(users.id, userId));

  await db
    .update(users)
    .set({ partnerId: userId })
    .where(eq(users.id, partner.id));

  revalidatePath("/partner");
}

export async function unlinkPartner(userId: string) {
  const db = getDb();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.partnerId) return;

  await db
    .update(users)
    .set({ partnerId: null })
    .where(eq(users.id, userId));

  await db
    .update(users)
    .set({ partnerId: null })
    .where(eq(users.id, user.partnerId));

  revalidatePath("/partner");
}
