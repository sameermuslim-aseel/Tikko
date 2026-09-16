"use client";

import { Check, Ellipsis } from "lucide-react";
import type { TaskForDate } from "@/lib/types";

export function TaskItem({
  task,
  onToggle,
  onOpenDetail,
  disabled,
}: {
  task: TaskForDate;
  onToggle: (task: TaskForDate) => void;
  onOpenDetail: (task: TaskForDate) => void;
  disabled?: boolean;
}) {
  return (
    // div بیرونی است چون دکمه داخل دکمه HTML نامعتبر است
    <div
      className={`flex items-center gap-1 rounded-xl border bg-background pl-1 transition-opacity ${
        task.is_completed ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        disabled={disabled}
        aria-pressed={task.is_completed}
        className="flex min-w-0 flex-1 items-center gap-3 p-3 text-right"
      >
        {/* اولویت بالا: نوار قرمز باریک، بدون هیاهو (PLAN بخش ۵) */}
        {task.priority === "high" && !task.is_completed && (
          <span className="h-10 w-1 shrink-0 rounded-full bg-destructive" />
        )}

        {/* سبز برای «انجام شد» — بازخورد مثبت، نه صرفاً تیره‌شدن */}
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            task.is_completed
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-muted-foreground/40"
          }`}
        >
          {task.is_completed && <Check className="size-4" strokeWidth={3} />}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={`truncate text-base ${task.is_completed ? "line-through" : ""}`}
          >
            {task.title}
          </span>

          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.category_name && (
              <span className="flex items-center gap-1">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: task.category_color ?? "#999" }}
                />
                {task.category_name}
              </span>
            )}
            {task.time_of_day && (
              <span dir="ltr">{task.time_of_day.slice(0, 5)}</span>
            )}
            {task.source === "admin" && <span>تعیین‌شده</span>}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => onOpenDetail(task)}
        aria-label={`جزئیات ${task.title}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
      >
        <Ellipsis className="size-5" />
      </button>
    </div>
  );
}
