"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTasksForRange,
  weekQueryKey,
  type RangeTask,
} from "@/lib/queries/week";
import { setTaskCompletion } from "@/lib/queries/tasks";
import {
  addWeeks,
  formatDayMonth,
  formatDayNumber,
  formatNumber,
  formatWeekdayLong,
  isSameDay,
  toDateKey,
  weekDays,
  weekStart,
} from "@/lib/date";

export function WeekView({ userId }: { userId: string }) {
  const [anchor, setAnchor] = useState(() => new Date());
  const today = new Date();

  const start = weekStart(anchor);
  const days = weekDays(start);
  const fromKey = toDateKey(days[0]);
  const toKey = toDateKey(days[6]);

  const queryClient = useQueryClient();
  const queryKey = weekQueryKey(fromKey, toKey);

  const { data: tasks, isPending, error } = useQuery({
    queryKey,
    queryFn: () => fetchTasksForRange(fromKey, toKey),
  });

  const toggle = useMutation({
    mutationFn: (task: RangeTask) =>
      setTaskCompletion({
        taskId: task.id,
        dateKey: task.day,
        completed: !task.is_completed,
        userId,
      }),

    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RangeTask[]>(queryKey);

      // کلید یکتا اینجا (id, day) است — یک تسک تکراری در چند روز تکرار می‌شود
      queryClient.setQueryData<RangeTask[]>(queryKey, (old) =>
        (old ?? []).map((t) =>
          t.id === task.id && t.day === task.day
            ? { ...t, is_completed: !t.is_completed }
            : t,
        ),
      );

      return { previous };
    },

    onError: (_error, _task, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const byDay = new Map<string, RangeTask[]>();
  for (const task of tasks ?? []) {
    const list = byDay.get(task.day) ?? [];
    list.push(task);
    byDay.set(task.day, list);
  }

  const weekTotal = tasks?.length ?? 0;
  const weekDone = tasks?.filter((t) => t.is_completed).length ?? 0;
  const weekPercent = weekTotal === 0 ? 0 : Math.round((weekDone / weekTotal) * 100);

  const isThisWeek = isSameDay(start, weekStart(today));

  return (
    <div className="flex flex-col gap-4">
      {/* ناوبری هفته */}
      <div className="flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setAnchor(addWeeks(anchor, -1))}
          aria-label="هفتهٔ قبل"
          className="flex size-11 items-center justify-center rounded-lg border"
        >
          <ChevronRight className="size-4" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-sm font-medium">
            {formatDayMonth(days[0])} – {formatDayMonth(days[6])}
          </span>
          {!isThisWeek && (
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              برگشت به این هفته
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAnchor(addWeeks(anchor, 1))}
          aria-label="هفتهٔ بعد"
          className="flex size-11 items-center justify-center rounded-lg border"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      {/* خلاصهٔ هفته */}
      <div className="mx-4 flex flex-col gap-2 rounded-xl border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">انجام‌شدهٔ این هفته</span>
          <span className="font-medium tabular-nums">
            {formatNumber(weekDone)} از {formatNumber(weekTotal)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${weekPercent}%` }}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="px-4 text-sm text-destructive">
          خطا در خواندن هفته: {error.message}
        </p>
      )}

      {isPending && (
        <div className="flex flex-col gap-2 px-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {/* روزهای هفته */}
      <div className="flex flex-col gap-3 px-4 pb-24">
        {days.map((day) => {
          const key = toDateKey(day);
          const dayTasks = byDay.get(key) ?? [];
          const done = dayTasks.filter((t) => t.is_completed).length;
          const isToday = isSameDay(day, today);
          // روز آینده هنوز نرسیده؛ RLS هم اجازهٔ تیک نمی‌دهد
          const isFuture = key > toDateKey(today);

          return (
            <section
              key={key}
              className={`rounded-xl border ${
                isToday ? "border-primary" : ""
              }`}
            >
              <header className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatWeekdayLong(day)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDayNumber(day)}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-background">
                      امروز
                    </span>
                  )}
                </span>

                {dayTasks.length > 0 && (
                  <span
                    className={`text-xs tabular-nums ${
                      done === dayTasks.length
                        ? "text-success"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatNumber(done)}/{formatNumber(dayTasks.length)}
                  </span>
                )}
              </header>

              {dayTasks.length === 0 ? (
                <p className="px-4 pb-3 text-xs text-muted-foreground">
                  تسکی نیست
                </p>
              ) : (
                <ul className="flex flex-col border-t">
                  {dayTasks.map((task) => (
                    <li key={`${task.id}-${task.day}`}>
                      <button
                        type="button"
                        onClick={() => toggle.mutate(task)}
                        disabled={isFuture}
                        aria-pressed={task.is_completed}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-right transition-opacity ${
                          task.is_completed ? "opacity-60" : ""
                        } ${isFuture ? "opacity-50" : ""}`}
                      >
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            task.is_completed
                              ? "border-success bg-success text-white"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {task.is_completed && (
                            <Check className="size-3" strokeWidth={3} />
                          )}
                        </span>

                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${
                            task.is_completed ? "line-through" : ""
                          }`}
                        >
                          {task.title}
                        </span>

                        {task.note && (
                          <MessageSquareText
                            className="size-3 shrink-0 text-muted-foreground"
                            aria-label="یادداشت دارد"
                          />
                        )}

                        {task.category_color && (
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: task.category_color }}
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
