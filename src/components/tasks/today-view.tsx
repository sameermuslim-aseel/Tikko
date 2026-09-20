"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DateStrip } from "./date-strip";
import { TaskItem } from "./task-item";
import { AddTaskDrawer } from "./add-task-drawer";
import { TaskDetailDrawer } from "./task-detail-drawer";
import { StreakChip } from "@/components/stats/streak-chip";
import { OverdueSection } from "./overdue-section";
import {
  fetchTasksForDate,
  setTaskCompletion,
  tasksQueryKey,
} from "@/lib/queries/tasks";
import { formatFullDate, toDateKey } from "@/lib/date";
import type { Role, TaskForDate } from "@/lib/types";

export function TodayView({
  userId,
  householdId,
  role,
  openNewTask = false,
}: {
  userId: string;
  householdId: string;
  role: Role;
  openNewTask?: boolean;
}) {
  const [selected, setSelected] = useState(() => new Date());
  const [detailTask, setDetailTask] = useState<TaskForDate | null>(null);

  const dateKey = toDateKey(selected);
  // روز آینده هنوز نرسیده؛ تیک زدنش هم در UI و هم در RLS بسته است
  const isFuture = dateKey > toDateKey(new Date());

  const queryClient = useQueryClient();
  const queryKey = tasksQueryKey(dateKey);

  const { data: tasks, isPending, error } = useQuery({
    queryKey,
    queryFn: () => fetchTasksForDate(dateKey),
  });

  const toggle = useMutation({
    mutationFn: (task: TaskForDate) =>
      setTaskCompletion({
        taskId: task.id,
        dateKey,
        completed: !task.is_completed,
        userId,
      }),

    // به‌روزرسانی خوش‌بینانه: تیک بدون انتظار برای سرور دیده شود
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskForDate[]>(queryKey);

      queryClient.setQueryData<TaskForDate[]>(queryKey, (old) =>
        (old ?? []).map((t) =>
          t.id === task.id ? { ...t, is_completed: !t.is_completed } : t,
        ),
      );

      return { previous };
    },

    // اگر سرور خطا داد، حالت قبلی برگردد
    onError: (_error, _task, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },

    // مرتب‌سازی (انجام‌شده‌ها پایین) سمت سرور است.
    // آمار هم باید تازه شود وگرنه استریک تا رفرش بعدی عوض نمی‌شود.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["overdue"] });
    },
  });

  return (
    <div className="flex flex-1 flex-col">
      <DateStrip selected={selected} onSelect={setSelected} />

      <div className="flex items-center justify-between px-4 pb-3">
        <p className="text-sm text-muted-foreground">
          {formatFullDate(selected)}
        </p>
        <StreakChip />
      </div>

      {isFuture && tasks && tasks.length > 0 && (
        <p className="mx-4 mb-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          این روز هنوز نرسیده — وقتی برسد می‌توانی تیک بزنی.
        </p>
      )}

      {dateKey === toDateKey(new Date()) && <OverdueSection userId={userId} />}

      <div className="flex flex-1 flex-col gap-2 px-4 pb-24">
        {isPending && (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            خطا در خواندن تسک‌ها: {error.message}
          </p>
        )}

        {tasks?.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-lg">🎉</p>
            <p className="text-sm text-muted-foreground">
              برای این روز تسکی نداری
            </p>
          </div>
        )}

        {tasks?.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={toggle.mutate}
            onOpenDetail={setDetailTask}
            disabled={toggle.isPending || isFuture}
          />
        ))}
      </div>

      <AddTaskDrawer
        householdId={householdId}
        userId={userId}
        dateKey={dateKey}
        openOnMount={openNewTask}
      />

      <TaskDetailDrawer
        task={detailTask}
        dateKey={dateKey}
        role={role}
        onClose={() => setDetailTask(null)}
      />
    </div>
  );
}
