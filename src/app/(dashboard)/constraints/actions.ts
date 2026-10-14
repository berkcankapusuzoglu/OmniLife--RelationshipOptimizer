"use server";

import { getDb } from "@/lib/db";
import { constraints } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";
import { requireAuth } from "@/lib/auth/guard";
import { constraintInput, optionalFormNumber, resourceId } from "@/lib/auth/action-inputs";
import { z } from "zod";

export async function addConstraint(formData: FormData) {
  const user = await requireAuth();
  const data = constraintInput.parse({ name: formData.get("name"), type: formData.get("type"), dimension: formData.get("dimension"), minValue: optionalFormNumber(formData.get("minValue")), maxValue: optionalFormNumber(formData.get("maxValue")), budgetHours: optionalFormNumber(formData.get("budgetHours")) });
  const db = getDb();

  await db.insert(constraints).values({
    id: uuid(),
    userId: user.id,
    name: data.name,
    type: data.type,
    dimension: data.dimension,
    minValue: data.minValue?.toString() ?? null,
    maxValue: data.maxValue?.toString() ?? null,
    budgetHours: data.budgetHours?.toString() ?? null,
    isActive: true,
  });

  revalidatePath("/constraints");
}

export async function toggleConstraint(id: string, isActive: boolean) {
  const user = await requireAuth();
  id = resourceId.parse(id);
  isActive = z.boolean().parse(isActive);
  const db = getDb();
  await db.update(constraints).set({ isActive }).where(and(eq(constraints.id, id), eq(constraints.userId, user.id)));
  revalidatePath("/constraints");
}

export async function removeConstraint(id: string) {
  const user = await requireAuth();
  id = resourceId.parse(id);
  const db = getDb();
  await db.delete(constraints).where(and(eq(constraints.id, id), eq(constraints.userId, user.id)));
  revalidatePath("/constraints");
}
