"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeekdayPicker } from "./weekday-picker";
import {
  fetchTask,
  taskQueryKey,
  updateTask,
  type EditableTask,
} from "@/lib/queries/tasks";
import { categoriesQueryKey, fetchCategories } from "@/lib/queries/categories";
import { adminKeys, fetchMembers } from "@/lib/queries/admin";
import type { AssignmentType, Priority, Role, ScheduleType } from "@/lib/types";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "کم" },
  { value: "medium", label: "متوسط" },
  { value: "high", label: "زیاد" },
];

/**
 * فرم ویرایش. مقدار اولیه را از خود ردیف تسک می‌گیرد، چون نمای امروز
 * زمان‌بندی و مسئول را برنمی‌گرداند و بدون آن‌ها ویرایش ناقص می‌شد.
 */
function EditForm({
  task,
  role,
  onDone,
}: {
  task: EditableTask;
  role: Role;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [categoryId, setCategoryId] = useState<string | null>(task.category_id);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>(
    task.assignment_type,
  );
  const [assignedTo, setAssignedTo] = useState<string | null>(task.assigned_to);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    task.schedule_type,
  );
  const [weekdays, setWeekdays] = useState<number[]>(task.weekdays ?? []);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const isAdmin = role === "admin";

  const { data: categories } = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
  });

  const { data: members } = useQuery({
    queryKey: adminKeys.members,
    queryFn: fetchMembers,
    enabled: isAdmin,
  });

  const save = useMutation({
    mutationFn: () =>
      updateTask({
        taskId: task.id,
        title,
        priority,
        categoryId,
        assignmentType,
        assignedTo,
        scheduleType,
        weekdays,
        dueDate: task.due_date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskQueryKey(task.id) });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["week"] });
      queryClient.invalidateQueries({ queryKey: ["overdue"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: adminKeys.tasks });
      onDone();
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("عنوان نمی‌تواند خالی باشد.");
      return;
    }
    if (scheduleType === "weekly" && weekdays.length === 0) {
      setError("حداقل یک روز هفته را انتخاب کنید.");
      return;
    }
    if (assignmentType === "one" && !assignedTo) {
      setError("مسئول تسک را انتخاب کنید.");
      return;
    }

    save.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-title">عنوان</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* مسئول تسک را فقط ادمین عوض می‌کند */}
        {isAdmin && (
          <div className="flex flex-col gap-2">
            <Label>برای چه کسی</Label>
            <div className="flex flex-wrap gap-2">
              {members?.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setAssignedTo(m.id);
                    setAssignmentType("one");
                  }}
                  className={`h-11 rounded-full border px-4 text-sm transition-colors ${
                    assignmentType === "one" && assignedTo === m.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-input text-muted-foreground"
                  }`}
                >
                  {m.display_name}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setAssignmentType("shared");
                  setAssignedTo(null);
                }}
                className={`h-11 rounded-full border px-4 text-sm transition-colors ${
                  assignmentType === "shared"
                    ? "border-foreground bg-foreground text-background"
                    : "border-input text-muted-foreground"
                }`}
              >
                مشترک
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>اولویت</Label>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`h-11 rounded-lg border text-sm transition-colors ${
                  priority === p.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-input text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {categories && categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label>کتگوری</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
                  className={`flex h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                    categoryId === c.id
                      ? "border-foreground"
                      : "border-input text-muted-foreground"
                  }`}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: c.color ?? "#999" }}
                  />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>تکرار</Label>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(
              [
                ["once", "یک‌بار"],
                ["weekly", "هفتگی"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScheduleType(value)}
                className={`h-10 rounded-md text-sm transition-colors ${
                  scheduleType === value
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {scheduleType === "weekly" && (
          <WeekdayPicker value={weekdays} onChange={setWeekdays} />
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <DrawerFooter className="shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <Button type="submit" disabled={save.isPending} className="h-12 text-base">
          {save.isPending ? "..." : "ذخیرهٔ تغییرات"}
        </Button>
        <Button variant="ghost" type="button" onClick={onDone}>
          لغو
        </Button>
      </DrawerFooter>
    </form>
  );
}

export function EditTaskDrawer({
  taskId,
  role,
  onClose,
}: {
  taskId: string | null;
  role: Role;
  onClose: () => void;
}) {
  const { data: task, isPending } = useQuery({
    queryKey: taskQueryKey(taskId ?? ""),
    queryFn: () => fetchTask(taskId!),
    enabled: taskId !== null,
  });

  return (
    <Drawer open={taskId !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
          <DrawerHeader className="shrink-0">
            <DrawerTitle>ویرایش تسک</DrawerTitle>
          </DrawerHeader>

          {isPending && (
            <div className="flex flex-col gap-3 px-4 pb-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          )}

          {task && (
            <EditForm key={task.id} task={task} role={role} onDone={onClose} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
