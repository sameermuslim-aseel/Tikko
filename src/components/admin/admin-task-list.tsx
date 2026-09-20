"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys, fetchAdminTasks, fetchMembers } from "@/lib/queries/admin";
import { categoriesQueryKey, fetchCategories } from "@/lib/queries/categories";
import { deleteTask } from "@/lib/queries/tasks";
import { WEEKDAY_LABELS } from "@/components/tasks/weekday-picker";
import type { Priority } from "@/lib/types";

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

export function AdminTaskList() {
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);

  const queryClient = useQueryClient();

  const { data: tasks, isPending } = useQuery({
    queryKey: adminKeys.tasks,
    queryFn: fetchAdminTasks,
  });

  const { data: members } = useQuery({
    queryKey: adminKeys.members,
    queryFn: fetchMembers,
  });

  const { data: categories } = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
  });

  const remove = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.tasks });
      queryClient.invalidateQueries({ queryKey: ["admin", "progress"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const filtered = tasks?.filter(
    (t) =>
      (!memberFilter ||
        t.assigned_to === memberFilter ||
        t.assignment_type === "shared") &&
      (!priorityFilter || t.priority === priorityFilter),
  );

  function assigneeLabel(task: { assigned_to: string | null; assignment_type: string }) {
    if (task.assignment_type === "shared") return "مشترک";
    return members?.find((m) => m.id === task.assigned_to)?.display_name ?? "—";
  }

  function categoryOf(id: string | null) {
    return categories?.find((c) => c.id === id);
  }

  return (
    <section className="flex flex-col gap-3 px-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        تسک‌های فعال {filtered ? `(${filtered.length})` : ""}
      </h2>

      {/* فیلترها */}
      <div className="flex flex-wrap gap-2">
        {members?.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() =>
              setMemberFilter(memberFilter === m.id ? null : m.id)
            }
            className={`h-9 rounded-full border px-3 text-xs transition-colors ${
              memberFilter === m.id
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground"
            }`}
          >
            {m.display_name}
          </button>
        ))}

        {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
            className={`h-9 rounded-full border px-3 text-xs transition-colors ${
              priorityFilter === p
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground"
            }`}
          >
            {PRIORITY_LABEL[p]}
          </button>
        ))}
      </div>

      {isPending && <div className="h-16 animate-pulse rounded-xl bg-muted" />}

      {filtered?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          تسکی با این فیلتر نیست
        </p>
      )}

      {filtered?.map((task) => {
        const category = categoryOf(task.category_id);

        return (
          <div
            key={task.id}
            className="flex items-center gap-2 rounded-xl border p-3"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-sm font-medium">{task.title}</span>

              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{assigneeLabel(task)}</span>

                {category && (
                  <span className="flex items-center gap-1">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: category.color ?? "#999" }}
                    />
                    {category.name}
                  </span>
                )}

                <span>{PRIORITY_LABEL[task.priority]}</span>

                <span>
                  {task.schedule_type === "weekly"
                    ? task.weekdays
                        ?.map((d) => WEEKDAY_LABELS[d])
                        .join("، ")
                    : "یک‌بار"}
                </span>

                {task.source === "self" && <span>شخصی</span>}
              </span>
            </div>

            <button
              type="button"
              onClick={() => remove.mutate(task.id)}
              disabled={remove.isPending}
              aria-label={`حذف ${task.title}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      })}

      {remove.error && (
        <p role="alert" className="text-sm text-destructive">
          {remove.error.message}
        </p>
      )}
    </section>
  );
}
