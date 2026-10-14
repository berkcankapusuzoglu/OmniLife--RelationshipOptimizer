"use client";

import { TaskBoard } from "@/components/tasks/TaskBoard";
import { createTask, updateTaskStatus } from "./actions";

interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status: "pending" | "in_progress" | "done";
  effortPoints: number;
  dueDate?: string;
  recurrence?: string;
}

export function TasksClient({
  tasks,
}: {
  tasks: Task[];
}) {
  return (
    <TaskBoard
      tasks={tasks}
      onStatusChange={async (taskId, status) => {
        await updateTaskStatus(taskId, status);
      }}
      onCreateTask={async (task) => {
        await createTask(task);
      }}
    />
  );
}
