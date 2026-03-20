"use server";

import { getDb } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";

export async function createTask(data: {
  title: string;
  description?: string;
  assigneeId?: string;
  createdById: string;
  effortPoints: number;
  dueDate?: string;
  recurrence?: string;
}) {
  const db = getDb();

  await db.insert(tasks).values({
    id: uuid(),
    title: data.title,
    description: data.description ?? null,
    assigneeId: data.assigneeId ?? null,
    createdById: data.createdById,
    status: "pending",
    effortPoints: data.effortPoints,
    dueDate: data.dueDate ?? null,
    recurrence: data.recurrence ?? null,
  });

  revalidatePath("/tasks");
}

export async function updateTaskStatus(taskId: string, status: string) {
  const db = getDb();

  await db
    .update(tasks)
    .set({
      status: status as "pending" | "in_progress" | "done",
      completedAt: status === "done" ? new Date() : null,
    })
    .where(eq(tasks.id, taskId));

  revalidatePath("/tasks");
}
