"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { PlusIcon, CalendarIcon, GripVerticalIcon } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  status: "pending" | "in_progress" | "done";
  effortPoints: number;
  dueDate?: string;
  recurrence?: string;
}

interface NewTask {
  title: string;
  description?: string;
  assigneeId?: string;
  effortPoints: number;
  dueDate?: string;
  recurrence?: string;
}

interface TaskBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: string) => void;
  onCreateTask: (task: NewTask) => void;
}

const COLUMNS = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
] as const;

function AssigneeAvatar({ name }: { name?: string }) {
  if (!name) return null;
  const initial = name.charAt(0).toUpperCase();
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {initial}
    </span>
  );
}

function TaskCard({
  task,
  onDragStart,
}: {
  task: Task;
  onDragStart: (taskId: string) => void;
}) {
  return (
    <div
      className="group rounded-lg border border-border bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart(task.id);
      }}
    >
      <div className="flex items-start gap-2">
        <GripVerticalIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-snug">{task.title}</p>
          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AssigneeAvatar name={task.assigneeName} />
            <span className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
              {task.effortPoints} pts
            </span>
            {task.dueDate && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarIcon className="size-2.5" />
                {task.dueDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileTaskCard({
  task,
  onStatusChange,
}: {
  task: Task;
  onStatusChange: (taskId: string, status: string) => void;
}) {
  const nextStatus = {
    pending: "in_progress",
    in_progress: "done",
    done: "pending",
  } as const;

  return (
    <div className="rounded-lg border border-border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{task.title}</p>
          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onStatusChange(task.id, nextStatus[task.status])}
        >
          {task.status === "pending"
            ? "Start"
            : task.status === "in_progress"
              ? "Done"
              : "Reopen"}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <AssigneeAvatar name={task.assigneeName} />
        <span className="inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
          {task.effortPoints} pts
        </span>
        {task.dueDate && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <CalendarIcon className="size-2.5" />
            {task.dueDate}
          </span>
        )}
      </div>
    </div>
  );
}

function CreateTaskDialog({
  onCreateTask,
}: {
  onCreateTask: (task: NewTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [effortPoints, setEffortPoints] = useState(1);
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreateTask({
      title: title.trim(),
      description: description.trim() || undefined,
      effortPoints,
      dueDate: dueDate || undefined,
    });
    setTitle("");
    setDescription("");
    setEffortPoints(1);
    setDueDate("");
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <PlusIcon data-icon="inline-start" />
            Add Task
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              placeholder="What needs to be done?"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="Optional details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="task-effort">Effort Points</Label>
              <Input
                id="task-effort"
                type="number"
                min={1}
                max={13}
                value={effortPoints}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEffortPoints(Number(e.target.value))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDueDate(e.target.value)
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaskBoard({
  tasks,
  onStatusChange,
  onCreateTask,
}: TaskBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent, columnKey: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverColumn(columnKey);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, columnKey: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("text/plain");
      if (taskId) {
        onStatusChange(taskId, columnKey);
      }
      setDraggedTaskId(null);
      setDragOverColumn(null);
    },
    [onStatusChange]
  );

  const columnTasks = (status: string) =>
    tasks.filter((t) => t.status === status);

  return (
    <div>
      {/* Desktop: Kanban columns */}
      <div className="hidden md:block">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Tasks</h2>
          <CreateTaskDialog onCreateTask={onCreateTask} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`rounded-xl bg-muted/40 p-3 transition-colors ${
                dragOverColumn === col.key
                  ? "ring-2 ring-ring/40 bg-muted/70"
                  : ""
              }`}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {col.label}
                </h3>
                <span className="text-xs text-muted-foreground/70">
                  {columnTasks(col.key).length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {columnTasks(col.key).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDragStart={setDraggedTaskId}
                  />
                ))}
                {columnTasks(col.key).length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground/50">
                    No tasks
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Tabbed list */}
      <div className="md:hidden">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Tasks</h2>
          <CreateTaskDialog onCreateTask={onCreateTask} />
        </div>
        <Tabs defaultValue="pending">
          <TabsList>
            {COLUMNS.map((col) => (
              <TabsTrigger key={col.key} value={col.key}>
                {col.label} ({columnTasks(col.key).length})
              </TabsTrigger>
            ))}
          </TabsList>
          {COLUMNS.map((col) => (
            <TabsContent key={col.key} value={col.key}>
              <div className="flex flex-col gap-2 pt-2">
                {columnTasks(col.key).map((task) => (
                  <MobileTaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={onStatusChange}
                  />
                ))}
                {columnTasks(col.key).length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground/50">
                    No tasks
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
