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
import { formatDayMonth, formatNumber } from "@/lib/date";

type Action = "done" | "today" | "skip";

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

  return (
    <section className="mx-4 mb-3 overflow-hidden rounded-xl border border-amber-500/40 bg-amber-500/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-right"
      >
        <span className="text-sm font-medium">
          از روزهای قبل مانده ({formatNumber(tasks.length)})
        </span>
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <ul className="flex flex-col border-t border-amber-500/20">
          {tasks.map((task) => (
            <li
              key={`${task.id}-${task.day}`}
              className="flex flex-col gap-2 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                {task.priority === "high" && (
                  <span className="h-4 w-1 shrink-0 rounded-full bg-destructive" />
                )}

                <span className="min-w-0 flex-1 truncate text-sm">
                  {task.title}
                </span>

                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDayMonth(new Date(`${task.day}T00:00:00`))}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={act.isPending}
                  onClick={() => act.mutate({ task, action: "done" })}
                  className="h-9 rounded-lg bg-emerald-500 text-xs font-medium text-white"
                >
                  انجام شد
                </button>

                <button
                  type="button"
                  disabled={act.isPending}
                  onClick={() => act.mutate({ task, action: "today" })}
                  className="h-9 rounded-lg border border-input text-xs"
                >
                  امروز می‌کنم
                </button>

                <button
                  type="button"
                  disabled={act.isPending}
                  onClick={() => act.mutate({ task, action: "skip" })}
                  className="h-9 rounded-lg border border-input text-xs text-muted-foreground"
                >
                  رد شد
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {act.error && (
        <p role="alert" className="px-4 pb-3 text-xs text-destructive">
          {act.error.message}
        </p>
      )}
    </section>
  );
}
