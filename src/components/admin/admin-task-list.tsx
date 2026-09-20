"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ListChecks,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys, fetchAdminTasks, fetchMembers } from "@/lib/queries/admin";
import { categoriesQueryKey, fetchCategories } from "@/lib/queries/categories";
import { deleteTask } from "@/lib/queries/tasks";
import { WEEKDAY_LABELS } from "@/components/tasks/weekday-picker";
import { formatNumber } from "@/lib/date";
import { TaskItemsList } from "@/components/tasks/task-items-list";
import { EditTaskDrawer } from "@/components/tasks/edit-task-drawer";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toDateKey } from "@/lib/date";
import type { AdminTask } from "@/lib/queries/admin";
import type { Priority } from "@/lib/types";

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

export function AdminTaskList({ userId }: { userId: string }) {
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);
  const [itemsTask, setItemsTask] = useState<AdminTask | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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

  // گروه‌بندی بر اساس مسئول؛ تسک مشترک گروه خودش را دارد
  const groups = (() => {
    const map = new Map<string, { key: string; label: string; tasks: AdminTask[] }>();

    for (const task of filtered ?? []) {
      const key =
        task.assignment_type === "shared" ? "shared" : (task.assigned_to ?? "none");

      const label =
        key === "shared"
          ? "مشترک"
          : (members?.find((m) => m.id === key)?.display_name ?? "بدون مسئول");

      const group = map.get(key) ?? { key, label, tasks: [] };
      group.tasks.push(task);
      map.set(key, group);
    }

    // اولویت بالا اول، تا مهم‌ها بالای هر گروه باشند
    const rank = { high: 0, medium: 1, low: 2 } as const;
    for (const group of map.values()) {
      group.tasks.sort((a, b) => rank[a.priority] - rank[b.priority]);
    }

    return [...map.values()].sort((a, b) => b.tasks.length - a.tasks.length);
  })();

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

      {/*
        گروه‌بندی بر اساس مسئول تسک. با ۳۰ تسک، لیست صاف نه قابل
        خواندن است و نه بدون اسکرول طولانی. سؤال اصلی ادمین هم همین
        است: هر کس مسئول چیست.
      */}
      {groups.map((group) => {
        const isOpen = openGroups[group.key] ?? group.tasks.length <= 6;

        return (
          <section key={group.key} className="overflow-hidden rounded-xl border">
            <button
              type="button"
              onClick={() =>
                setOpenGroups({ ...openGroups, [group.key]: !isOpen })
              }
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between px-4 py-3 text-right"
            >
              <span className="flex items-center gap-2">
                {group.key === "shared" ? (
                  <Users className="size-4 text-muted-foreground" />
                ) : (
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
                    {[...group.label][0]}
                  </span>
                )}
                <span className="text-sm font-medium">{group.label}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatNumber(group.tasks.length)})
                </span>
              </span>

              {isOpen ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronLeft className="size-4 text-muted-foreground" />
              )}
            </button>

            {isOpen && (
              <ul className="flex flex-col border-t">
                {group.tasks.map((task) => {
                  const category = categoryOf(task.category_id);

                  return (
                    <li
                      key={task.id}
                      className="flex items-center gap-1 border-b px-3 py-2 last:border-b-0"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-1.5">
                          {task.priority === "high" && (
                            <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
                          )}
                          <span className="truncate text-sm">{task.title}</span>
                        </span>

                        <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                          <span>
                            {task.schedule_type === "weekly"
                              ? task.weekdays?.map((d) => WEEKDAY_LABELS[d]).join("،")
                              : "یک‌بار"}
                          </span>

                          {category && (
                            <span className="flex items-center gap-1">
                              <span
                                className="size-1.5 rounded-full"
                                style={{ backgroundColor: category.color ?? "#999" }}
                              />
                              {category.name}
                            </span>
                          )}

                          {task.task_type === "list" && <span>لیستی</span>}
                          {task.source === "self" && <span>شخصی</span>}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditTaskId(task.id)}
                        aria-label={`ویرایش ${task.title}`}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>

                      {task.task_type === "list" && (
                        <button
                          type="button"
                          onClick={() => setItemsTask(task)}
                          aria-label={`آیتم‌های ${task.title}`}
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
                        >
                          <ListChecks className="size-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => remove.mutate(task.id)}
                        disabled={remove.isPending}
                        aria-label={`حذف ${task.title}`}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      {remove.error && (
        <p role="alert" className="text-sm text-destructive">
          {remove.error.message}
        </p>
      )}

      {/*
        تیک‌ها روزانه‌اند، ولی ادمین اینجا فقط آیتم‌ها را می‌سازد.
        تاریخ امروز را می‌دهیم چون آیتم‌ها به خود تسک وصل‌اند نه به روز.
      */}
      <Drawer
        open={itemsTask !== null}
        onOpenChange={(open) => !open && setItemsTask(null)}
      >
        <DrawerContent>
          <div className="mx-auto min-h-0 w-full max-w-md flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <DrawerHeader className="px-0">
              <DrawerTitle>{itemsTask?.title}</DrawerTitle>
            </DrawerHeader>

            {itemsTask && (
              <TaskItemsList
                key={itemsTask.id}
                taskId={itemsTask.id}
                dateKey={toDateKey(new Date())}
                userId={userId}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <EditTaskDrawer
        taskId={editTaskId}
        role="admin"
        onClose={() => setEditTaskId(null)}
      />
    </section>
  );
}
