"use server";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { requireAuth } from "@/lib/auth/guard";
import { inviteInput } from "@/lib/auth/action-inputs";
import { claimPartnerInvite } from "@/lib/auth/authorization";

export type PartnerActionResult = { ok: true } | { ok: false; error: string };

// Plain-data error copy for the client. Never includes provider or driver details.
const LINK_ERRORS = {
  invalidFormat: "Enter the 6-character code your partner shared with you.",
  alreadyLinked: "You are already linked with a partner. Unlink first to use a new code.",
  ownCode: "That is your own invite code. Share it with your partner instead of entering it here.",
  notFound: "That code is not valid or has already been used. Ask your partner for a new one.",
  unavailable: "We could not link your accounts right now. Please try again.",
} as const;

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

export async function linkPartner(inviteCode: string): Promise<PartnerActionResult> {
  const user = await requireAuth();
  const parsed = inviteInput.safeParse(inviteCode);
  if (!parsed.success) return { ok: false, error: LINK_ERRORS.invalidFormat };
  if (user.partnerId) return { ok: false, error: LINK_ERRORS.alreadyLinked };
  if (user.partnerInviteCode === parsed.data) return { ok: false, error: LINK_ERRORS.ownCode };

  let linked = false;
  try {
    linked = await claimPartnerInvite(user.id, parsed.data);
  } catch {
    return { ok: false, error: LINK_ERRORS.unavailable };
  }
  if (!linked) return { ok: false, error: LINK_ERRORS.notFound };

  revalidatePath("/partner");
  return { ok: true };
}

export async function unlinkPartner(): Promise<PartnerActionResult> {
  const user = await requireAuth();
  const db = getDb();
  const partnerId = user.partnerId;
  if (!partnerId) return { ok: false, error: "You are not linked with a partner." };
  try {
    await db.transaction(async (tx) => {
      const removed = await tx.update(users).set({ partnerId: null, partnerInviteCode: null })
        .where(and(eq(users.id, user.id), eq(users.partnerId, partnerId))).returning({ id: users.id });
      if (!removed.length) return;
      await tx.update(users).set({ partnerId: null, partnerInviteCode: null })
        .where(and(eq(users.id, partnerId), eq(users.partnerId, user.id)));
    });
  } catch {
    return { ok: false, error: "We could not unlink your accounts right now. Please try again." };
  }

  revalidatePath("/partner");
  return { ok: true };
}
