"use server";

import { getDb } from "@/lib/db";
import { constraints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";

export async function addConstraint(formData: FormData) {
  const db = getDb();

  await db.insert(constraints).values({
    id: uuid(),
    userId: formData.get("userId") as string,
    name: formData.get("name") as string,
    type: formData.get("type") as "time_budget" | "energy_budget" | "redline",
    dimension: formData.get("dimension") as string,
    minValue: formData.get("minValue")
      ? (formData.get("minValue") as string)
      : null,
    maxValue: formData.get("maxValue")
      ? (formData.get("maxValue") as string)
      : null,
    budgetHours: formData.get("budgetHours")
      ? (formData.get("budgetHours") as string)
      : null,
    isActive: true,
  });

  revalidatePath("/constraints");
}

export async function toggleConstraint(id: string, isActive: boolean) {
  const db = getDb();
  await db.update(constraints).set({ isActive }).where(eq(constraints.id, id));
  revalidatePath("/constraints");
}

export async function removeConstraint(id: string) {
  const db = getDb();
  await db.delete(constraints).where(eq(constraints.id, id));
  revalidatePath("/constraints");
}
