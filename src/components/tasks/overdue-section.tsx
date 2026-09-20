"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeOverdue,
  deferToToday,
  fetchOverdueTasks,
  overdueQueryKey,
  skipOverdue,
  type OverdueTask,
} from "@/lib/queries/overdue";
import { formatDayMonth, formatNumber, relativeDayLabel } from "@/lib/date";

type Action = "done" | "today" | "skip";

const PRIORITY_LABEL: Record<string, string> = {
  high: "زیاد",
  medium: "متوسط",
  low: "کم",
};

export function OverdueSection({ userId }: { userId: string }) {
  const [open, setOpen] = useState(true);
  const queryClient = useQueryClient();

  const { data: tasks } = useQuery({
    queryKey: overdueQueryKey,
    queryFn: fetchOverdueTasks,
  });

  const act = useMutation({
    mutationFn: async ({
      task,
      action,
    }: {
      task: OverdueTask;
      action: Action;
    }) => {
      if (action === "done") {
        return completeOverdue({ taskId: task.id, day: task.day, userId });
      }
      if (action === "skip") {
        return skipOverdue({ taskId: task.id, day: task.day, userId });
      }
      return deferToToday({ taskId: task.id, day: task.day });
    },

    // حذف خوش‌بینانه: هر سه عمل باعث می‌شوند مورد از لیست برود
    onMutate: async ({ task }) => {
      await queryClient.cancelQueries({ queryKey: overdueQueryKey });
      const previous = queryClient.getQueryData<OverdueTask[]>(overdueQueryKey);

      queryClient.setQueryData<OverdueTask[]>(overdueQueryKey, (old) =>
        (old ?? []).filter((t) => !(t.id === task.id && t.day === task.day)),
      );

      return { previous };
    },

    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(overdueQueryKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: overdueQueryKey });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["week"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  // چیزی عقب نمانده → اصلاً چیزی نشان نده
  if (!tasks || tasks.length === 0) return null;

  // گروه‌بندی بر اساس روز، تا معلوم باشد هر کدام مال کدام روز است
  const byDay = new Map<string, OverdueTask[]>();
  for (const task of tasks) {
    const list = byDay.get(task.day) ?? [];
    list.push(task);
    byDay.set(task.day, list);
  }

  return (
    <section className="mx-4 mb-3 overflow-hidden rounded-xl border border-attention/40 bg-attention/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-right"
      >
        <span className="flex flex-col">
          <span className="text-sm font-medium">
            از روزهای قبل مانده ({formatNumber(tasks.length)})
          </span>
          {!open && (
            <span className="text-xs text-muted-foreground">
              برای بررسی لمس کن
            </span>
          )}
        </span>

        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-attention/20">
          <p className="px-4 pt-3 text-xs text-muted-foreground">
            هر کدام را بررسی کن: انجامش دادی، امروز می‌کنی، یا دیگر لازم نیست.
          </p>

          {[...byDay.entries()].map(([day, dayTasks]) => (
            <div key={day}>
              <div className="flex items-baseline gap-2 px-4 pt-3">
                <span className="text-xs font-medium">
                  {relativeDayLabel(day)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDayMonth(new Date(`${day}T00:00:00`))}
                </span>
              </div>

              <ul className="flex flex-col">
                {dayTasks.map((task) => (
                  <li
                    key={`${task.id}-${task.day}`}
                    className="flex flex-col gap-2 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      {task.priority === "high" && (
                        <span className="h-4 w-1 shrink-0 rounded-full bg-destructive" />
                      )}

                      <span className="min-w-0 flex-1 truncate text-sm">
                        {task.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {task.category_name && (
                        <span className="flex items-center gap-1">
                          <span
                            className="size-2 rounded-full"
                            style={{
                              backgroundColor: task.category_color ?? "#999",
                            }}
                          />
                          {task.category_name}
                        </span>
                      )}

                      <span>اولویت {PRIORITY_LABEL[task.priority]}</span>

                      {task.source === "admin" && <span>تعیین‌شده</span>}

                      {task.schedule_type === "weekly" && <span>تکراری</span>}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ task, action: "done" })}
                        className="h-9 rounded-lg bg-success text-xs font-medium text-success-foreground"
                      >
                        انجام شد
                      </button>

                      <button
                        type="button"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ task, action: "today" })}
                        className="h-9 rounded-lg border border-input bg-background text-xs"
                      >
                        امروز می‌کنم
                      </button>

                      <button
                        type="button"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ task, action: "skip" })}
                        className="h-9 rounded-lg border border-input bg-background text-xs text-muted-foreground"
                      >
                        لازم نیست
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="h-2" />
        </div>
      )}

      {act.error && (
        <p role="alert" className="px-4 pb-3 text-xs text-destructive">
          {act.error.message}
        </p>
      )}
    </section>
  );
}
