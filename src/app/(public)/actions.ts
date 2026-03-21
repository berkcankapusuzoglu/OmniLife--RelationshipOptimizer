"use server";

import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";

const emailSchema = z.string().email("Please enter a valid email address.");

export async function subscribeAction(formData: FormData) {
  const raw = formData.get("email");
  const parsed = emailSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
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
