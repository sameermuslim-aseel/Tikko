"use client";

import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { fetchDailyStats, statsQueryKey } from "@/lib/queries/stats";
import {
  bestStreak,
  completionRate,
  currentStreak,
  type DailyStat,
} from "@/lib/streak";
import { formatDayNumber, toDateKey } from "@/lib/date";

const HISTORY_DAYS = 90;
const STRIP_DAYS = 14;

function dayState(stat: DailyStat): "empty" | "partial" | "done" {
  if (stat.total === 0) return "empty";
  return stat.completed >= stat.total ? "done" : "partial";
}

export function StatsView() {
  const today = new Date();
  const todayKey = toDateKey(today);
  const fromKey = toDateKey(addDays(today, -(HISTORY_DAYS - 1)));

  const { data: stats, isPending, error } = useQuery({
    queryKey: statsQueryKey(fromKey, todayKey),
    queryFn: () => fetchDailyStats(fromKey, todayKey),
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 px-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="px-4 text-sm text-destructive">
        خطا در خواندن آمار: {error.message}
      </p>
    );
  }

  const all = stats ?? [];
  const streak = currentStreak(all, todayKey);
  const best = bestStreak(all);

  const last30 = all.filter((s) => s.day >= toDateKey(addDays(today, -29)));
  const rate30 = completionRate(last30);

  const strip = all.slice(-STRIP_DAYS);
  const totalDone = all.reduce((sum, s) => sum + s.completed, 0);

  return (
    <div className="flex flex-col gap-4 px-4">
      {/* استریک فعلی */}
      <div className="flex flex-col items-center gap-1 rounded-xl border p-6">
        <span className="text-4xl">{streak > 0 ? "🔥" : "🌱"}</span>
        <span className="text-3xl font-bold">{streak}</span>
        <span className="text-sm text-muted-foreground">
          {streak > 0 ? "روز پشت‌سرهم" : "امروز شروع کن"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl border p-4">
          <span className="text-xs text-muted-foreground">بهترین استریک</span>
          <span className="text-xl font-semibold">{best} روز</span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border p-4">
          <span className="text-xs text-muted-foreground">۳۰ روز اخیر</span>
          <span className="text-xl font-semibold">٪{rate30}</span>
        </div>
      </div>

      {/* نوار ۱۴ روز اخیر */}
      <div className="flex flex-col gap-2 rounded-xl border p-4">
        <span className="text-xs text-muted-foreground">۱۴ روز اخیر</span>

        <div className="flex justify-between gap-1">
          {strip.map((stat) => {
            const state = dayState(stat);
            return (
              <div key={stat.day} className="flex flex-col items-center gap-1">
                <div
                  title={`${stat.completed}/${stat.total}`}
                  className={`size-6 rounded-md ${
                    state === "done"
                      ? "bg-foreground"
                      : state === "partial"
                        ? "bg-muted-foreground/40"
                        : "bg-muted"
                  }`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {formatDayNumber(new Date(`${stat.day}T00:00:00`))}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        مجموع تسک‌های انجام‌شده در {HISTORY_DAYS} روز: {totalDone}
      </p>
    </div>
  );
}
