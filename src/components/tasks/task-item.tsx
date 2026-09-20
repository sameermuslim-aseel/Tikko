"use client";

import {
  Check,
  Ellipsis,
  ListChecks,
  MessageSquareText,
  Minus,
  Users,
} from "lucide-react";
import { formatNumber, relativeDayLabel } from "@/lib/date";
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
  const isSkipped = task.status === "skipped";
  // تسک لیستی با تیک زدن آیتم‌هایش کامل می‌شود، نه با یک لمس روی خودش
  const isList = task.task_type === "list";

  return (
    // div بیرونی است چون دکمه داخل دکمه HTML نامعتبر است
    <div
      className={`flex items-center gap-1 rounded-xl border bg-background pl-1 transition-opacity ${
        task.is_completed || isSkipped ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => (isList ? onOpenDetail(task) : onToggle(task))}
        disabled={disabled && !isList}
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
              : isSkipped
                ? "border-muted-foreground/40 text-muted-foreground"
                : "border-muted-foreground/40"
          }`}
        >
          {task.is_completed && <Check className="size-4" strokeWidth={3} />}
          {isSkipped && <Minus className="size-3.5" strokeWidth={3} />}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={`truncate text-base ${task.is_completed || isSkipped ? "line-through" : ""}`}
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
            {isList && (
              <span className="flex items-center gap-1">
                <ListChecks className="size-3" />
                {formatNumber(task.items_done)}/{formatNumber(task.items_total)}
              </span>
            )}
            {isSkipped && <span>رد شد</span>}
            {task.source === "admin" && <span>تعیین‌شده</span>}

            {/* تسک مشترک: قبل از انجام «مشترک»، بعد از انجام اسم کسی که کرد */}
            {task.assignment_type === "shared" &&
              (task.is_completed && task.completed_by_name ? (
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {task.completed_by_name}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  مشترک
                </span>
              ))}

            {/* از کدام روز عقب افتاده بود — وگرنه در لیست امروز گم می‌شود */}
            {task.deferred_from && !task.is_completed && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                مانده از {relativeDayLabel(task.deferred_from)}
              </span>
            )}
            {task.note && (
              <MessageSquareText
                className="size-3"
                aria-label="یادداشت دارد"
              />
            )}
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
