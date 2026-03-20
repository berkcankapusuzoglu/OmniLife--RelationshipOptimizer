"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "./password";
import { createSession, deleteSession } from "./session";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerAction(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = authSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password } = parsed.data;
  const db = getDb();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning({ id: users.id });

  await createSession(newUser.id);
  redirect("/");
}

export async function loginAction(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = authSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password } = parsed.data;
  const db = getDb();

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return { error: "Invalid email or password" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
