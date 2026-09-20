"use client";

import { useState } from "react";
import { addDays } from "date-fns";
import {
  ChevronDown,
  ChevronLeft,
  ListChecks,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { TaskItemsList } from "@/components/tasks/task-items-list";
import { EditTaskDrawer } from "@/components/tasks/edit-task-drawer";
import { WEEKDAY_LABELS } from "@/components/tasks/weekday-picker";
import {
  adminKeys,
  fetchAdminTasks,
  fetchMemberProgress,
  fetchMembers,
  type AdminTask,
  type MemberProgress,
} from "@/lib/queries/admin";
import { categoriesQueryKey, fetchCategories } from "@/lib/queries/categories";
import { deleteTask } from "@/lib/queries/tasks";
import { formatNumber, toDateKey } from "@/lib/date";
import type { Priority } from "@/lib/types";

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

/** گروه: یک عضو خانواده، یا تسک‌های مشترک */
type Group = {
  key: string;
  label: string;
  role: string | null;
  tasks: AdminTask[];
};

function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-success transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * داشبورد به‌صورت «هر نفر یک کارت».
 *
 * قبلاً پیشرفت و تسک‌ها دو بخش جدا بودند و هر نفر دو بار در صفحه
 * تکرار می‌شد. حالا سرصفحهٔ بستهٔ هر کارت همان خلاصهٔ پیشرفت است و
 * باز کردنش تسک‌ها را نشان می‌دهد.
 */
export function MemberSections({ userId }: { userId: string }) {
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [itemsTask, setItemsTask] = useState<AdminTask | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const today = toDateKey(new Date());
  const weekAgo = toDateKey(addDays(new Date(), -6));

  const { data: members } = useQuery({
    queryKey: adminKeys.members,
    queryFn: fetchMembers,
  });

  const { data: tasks, isPending } = useQuery({
    queryKey: adminKeys.tasks,
    queryFn: fetchAdminTasks,
  });

  const { data: categories } = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
  });

  const { data: todayProgress } = useQuery({
    queryKey: adminKeys.progress(today, today),
    queryFn: () => fetchMemberProgress(today, today),
  });

  const { data: weekProgress } = useQuery({
    queryKey: adminKeys.progress(weekAgo, today),
    queryFn: () => fetchMemberProgress(weekAgo, today),
  });

  const remove = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.tasks });
      queryClient.invalidateQueries({ queryKey: ["admin", "progress"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const filtered = (tasks ?? []).filter(
    (t) => !priorityFilter || t.priority === priorityFilter,
  );

  // هر عضو یک گروه دارد حتی اگر تسکی نداشته باشد — پیشرفتش باید دیده شود
  const groups: Group[] = [
    ...(members ?? []).map((m) => ({
      key: m.id,
      label: m.display_name ?? "بی‌نام",
      role: m.role,
      tasks: filtered.filter(
        (t) => t.assignment_type === "one" && t.assigned_to === m.id,
      ),
    })),
    {
      key: "shared",
      label: "مشترک",
      role: null,
      tasks: filtered.filter((t) => t.assignment_type === "shared"),
    },
  ].filter((group) => group.key !== "shared" || group.tasks.length > 0);

  const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  for (const group of groups) {
    group.tasks.sort((a, b) => rank[a.priority] - rank[b.priority]);
  }

  function statsFor(
    list: MemberProgress[] | undefined,
    key: string,
  ): MemberProgress | undefined {
    return list?.find((p) => p.user_id === key);
  }

  function categoryOf(id: string | null) {
    return categories?.find((c) => c.id === id);
  }

  return (
    <section className="flex flex-col gap-3 px-4">
      {/* فیلتر «کی» حذف شد — خود گروه‌ها همان کار را می‌کنند */}
      <div className="flex flex-wrap gap-2">
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

      {isPending && <div className="h-20 animate-pulse rounded-xl bg-muted" />}

      {groups.map((group) => {
        const isOpen = openGroups[group.key] ?? false;
        const todayStats = statsFor(todayProgress, group.key);
        const weekStats = statsFor(weekProgress, group.key);

        return (
          <section key={group.key} className="overflow-hidden rounded-xl border">
            <button
              type="button"
              onClick={() =>
                setOpenGroups({ ...openGroups, [group.key]: !isOpen })
              }
              aria-expanded={isOpen}
              className="flex w-full flex-col gap-2 px-4 py-3 text-right"
            >
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {group.key === "shared" ? (
                    <Users className="size-6 rounded-full bg-muted p-1 text-muted-foreground" />
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background">
                      {[...group.label][0]}
                    </span>
                  )}

                  <span className="text-sm font-medium">{group.label}</span>

                  {group.role && (
                    <span className="text-[11px] text-muted-foreground">
                      {group.role === "admin" ? "ادمین" : "عضو"}
                    </span>
                  )}

                  <span className="text-[11px] text-muted-foreground">
                    · {formatNumber(group.tasks.length)} تسک
                  </span>
                </span>

                {isOpen ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronLeft className="size-4 text-muted-foreground" />
                )}
              </span>

              {/* خلاصهٔ امروز در سرصفحه می‌ماند — همان کاری که بخش «پیشرفت» می‌کرد */}
              {group.key !== "shared" && (
                <span className="flex flex-col gap-1">
                  <span className="flex justify-between text-[11px] text-muted-foreground">
                    <span>امروز</span>
                    <span>
                      {formatNumber(todayStats?.completed ?? 0)} از{" "}
                      {formatNumber(todayStats?.total ?? 0)}
                    </span>
                  </span>
                  <ProgressBar
                    done={todayStats?.completed ?? 0}
                    total={todayStats?.total ?? 0}
                  />
                </span>
              )}
            </button>

            {isOpen && (
              <div className="border-t">
                {/* ۷ روز اخیر جزئیات است، نه نگاه سریع — پس داخل کارت */}
                {group.key !== "shared" && (
                  <div className="flex flex-col gap-1 border-b px-4 py-3">
                    <span className="flex justify-between text-[11px] text-muted-foreground">
                      <span>۷ روز اخیر</span>
                      <span>
                        {formatNumber(weekStats?.completed ?? 0)} از{" "}
                        {formatNumber(weekStats?.total ?? 0)}
                      </span>
                    </span>
                    <ProgressBar
                      done={weekStats?.completed ?? 0}
                      total={weekStats?.total ?? 0}
                    />
                  </div>
                )}

                {group.tasks.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground">
                    تسکی ندارد
                  </p>
                ) : (
                  <ul className="flex flex-col">
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
                              <span className="truncate text-sm">
                                {task.title}
                              </span>
                            </span>

                            <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                              <span>
                                {task.schedule_type === "weekly"
                                  ? task.weekdays
                                      ?.map((d) => WEEKDAY_LABELS[d])
                                      .join("،")
                                  : "یک‌بار"}
                              </span>

                              {category && (
                                <span className="flex items-center gap-1">
                                  <span
                                    className="size-1.5 rounded-full"
                                    style={{
                                      backgroundColor: category.color ?? "#999",
                                    }}
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
              </div>
            )}
          </section>
        );
      })}

      {remove.error && (
        <p role="alert" className="text-sm text-destructive">
          {remove.error.message}
        </p>
      )}

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
                dateKey={today}
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
