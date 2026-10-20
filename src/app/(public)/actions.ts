"use server";

import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";

// RFC 5321 caps a full address at 254 characters and the local part at 64.
const emailSchema = z
  .string({ error: "Please enter a valid email address." })
  .trim()
  .max(254, "Please enter a valid email address.")
  .email("Please enter a valid email address.")
  .refine((value) => value.split("@")[0].length <= 64, "Please enter a valid email address.")
  .transform((value) => value.toLowerCase());

export async function subscribeAction(formData: FormData) {
  const raw = formData.get("email");
  const parsed = emailSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const db = getDb();
    await db
      .insert(subscribers)
      .values({
        id: uuidv4(),
        email: parsed.data,
        source: (formData.get("source") as string) || "unknown",
      })
      .onConflictDoNothing({ target: subscribers.email });

    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
