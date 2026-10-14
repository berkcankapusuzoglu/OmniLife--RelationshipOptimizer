"use server";

import { getDb } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";
import { requireAuth } from "@/lib/auth/guard";
import { linkedPartnerId } from "@/lib/auth/authorization";
import { resourceId, taskInput, taskStatus } from "@/lib/auth/action-inputs";

export async function createTask(data: {
  title: string;
  description?: string;
  assigneeId?: string;
  effortPoints: number;
  dueDate?: string;
  recurrence?: string;
}) {
  const user = await requireAuth();
  data = taskInput.parse(data);
  if (data.assigneeId && data.assigneeId !== user.id && data.assigneeId !== await linkedPartnerId(user)) {
    throw new Error("Invalid assignee");
  }
  const db = getDb();

  await db.insert(tasks).values({
    id: uuid(),
    title: data.title,
    description: data.description ?? null,
    assigneeId: data.assigneeId ?? null,
    createdById: user.id,
    status: "pending",
    effortPoints: data.effortPoints,
    dueDate: data.dueDate ?? null,
    recurrence: data.recurrence ?? null,
  });

  revalidatePath("/tasks");
}

export async function updateTaskStatus(taskId: string, status: string) {
  const user = await requireAuth();
  taskId = resourceId.parse(taskId);
  const validatedStatus = taskStatus.parse(status);
  const db = getDb();

  await db
    .update(tasks)
    .set({
      status: validatedStatus,
      completedAt: status === "done" ? new Date() : null,
    })
    .where(and(eq(tasks.id, taskId), or(eq(tasks.createdById, user.id), eq(tasks.assigneeId, user.id))));

  revalidatePath("/tasks");
}
