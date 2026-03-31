import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession, renewSession } from "./session";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (user) {
    await renewSession(user.id);
  }

  return user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
