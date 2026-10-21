"use server";

import { z } from "zod";
import { eq, and, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";
import { users, passwordResets } from "@/lib/db/schema";
import { hashPassword } from "./password";
import { sendPasswordResetEmail } from "@/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://couplemetric.app";

function getResetBaseUrl(): string {
  const url = new URL(BASE_URL);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("Password reset origin must use HTTPS");
  }
  return url.origin;
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();

  if (!email || !z.string().email().safeParse(email).success) {
    return { error: "Please enter a valid email address." };
  }

  const db = getDb();

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Always return success to prevent email enumeration
  if (!user) {
    return { success: true };
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResets).values({
    userId: user.id,
    token,
    expiresAt,
  });

  try {
    const resetUrl = `${getResetBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch {
    console.error("Password reset delivery operation failed");
    // Don't expose email sending failures to the user
  }

  return { success: true };
}

export async function resetPasswordAction(formData: FormData) {
  const token = formData.get("token") as string | null;
  const password = formData.get("password") as string | null;
  const confirm = formData.get("confirm") as string | null;

  if (!token) return { error: "Invalid reset link." };
  if (!password || password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const db = getDb();
  const now = new Date();

  const [reset] = await db
    .select({ id: passwordResets.id, userId: passwordResets.userId })
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.token, token),
        gt(passwordResets.expiresAt, now),
        isNull(passwordResets.usedAt)
      )
    )
    .limit(1);

  if (!reset) {
    return {
      error: "This reset link is invalid or has expired. Please request a new one.",
    };
  }

  const passwordHash = await hashPassword(password);

  const committed = await db.transaction(async (tx) => {
    const [claimed] = await tx.update(passwordResets)
      .set({ usedAt: now })
      .where(and(eq(passwordResets.id, reset.id), gt(passwordResets.expiresAt, now), isNull(passwordResets.usedAt)))
      .returning({ userId: passwordResets.userId });
    if (!claimed) return false;
    const updated = await tx.update(users).set({ passwordHash }).where(eq(users.id, claimed.userId)).returning({ id: users.id });
    if (!updated.length) throw new Error("Password reset user update failed");
    return true;
  });
  if (!committed) return { error: "This reset link is invalid or has expired. Please request a new one." };

  redirect("/login?reset=success");
}
