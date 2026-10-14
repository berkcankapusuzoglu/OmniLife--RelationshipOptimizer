import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function linkedPartnerId(user: { id: string; partnerId: string | null }) {
  if (!user.partnerId) return null;
  const [partner] = await getDb().select({ id: users.id }).from(users)
    .where(and(eq(users.id, user.partnerId), eq(users.partnerId, user.id))).limit(1);
  return partner?.id ?? null;
}
