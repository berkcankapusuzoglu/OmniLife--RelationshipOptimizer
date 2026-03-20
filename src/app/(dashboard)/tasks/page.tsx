import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const user = await requireAuth();
  const db = getDb();

  const userTasks = await db
    .select()
    .from(tasks)
    .where(
      or(eq(tasks.assigneeId, user.id), eq(tasks.createdById, user.id))
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Household Tasks
        </h1>
        <p className="text-sm text-muted-foreground">
          Track and balance shared responsibilities
        </p>
      </div>
      <TasksClient
        tasks={userTasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description ?? undefined,
          assigneeId: t.assigneeId ?? undefined,
          status: t.status as "pending" | "in_progress" | "done",
          effortPoints: t.effortPoints,
          dueDate: t.dueDate ?? undefined,
          recurrence: t.recurrence ?? undefined,
        }))}
        userId={user.id}
      />
    </div>
  );
}
