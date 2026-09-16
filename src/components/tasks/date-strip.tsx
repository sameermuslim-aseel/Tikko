"use client";

import {
  formatDayNumber,
  formatWeekday,
  isSameDay,
  toDateKey,
  weekAround,
} from "@/lib/date";

export function DateStrip({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (date: Date) => void;
}) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const days = weekAround(today);

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {days.map((day) => {
        const isSelected = isSameDay(day, selected);
        const isToday = isSameDay(day, today);
        // روز آینده قابل تیک زدن نیست — کم‌رنگ نشان داده می‌شود
        const isFuture = toDateKey(day) > todayKey;

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelect(day)}
            aria-pressed={isSelected}
            // هدف لمسی حداقل ۴۴px (PLAN بخش ۵)
            className={`flex h-16 min-w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border transition-colors ${
              isSelected
                ? isFuture
                  // انتخاب‌شده ولی هنوز نرسیده: حاشیه دارد اما پُر نیست
                  ? "border-foreground/40 bg-transparent text-muted-foreground"
                  : "border-foreground bg-foreground text-background"
                : isFuture
                  ? "border-transparent bg-muted/50 text-muted-foreground/50"
                  : "border-transparent bg-muted text-foreground"
            }`}
          >
            <span className="text-[11px] opacity-70">{formatWeekday(day)}</span>
            <span className="text-base font-semibold">{formatDayNumber(day)}</span>
            {isToday && (
              <span
                className={`h-1 w-1 rounded-full ${
                  isSelected ? "bg-background" : "bg-foreground"
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
