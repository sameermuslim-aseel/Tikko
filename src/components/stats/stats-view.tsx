"use client";

import { Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { fetchDailyStats, statsQueryKey } from "@/lib/queries/stats";
import {
  bestStreak,
  completionRate,
  currentStreak,
  type DailyStat,
} from "@/lib/streak";
import { formatDayNumber, formatNumber, toDateKey } from "@/lib/date";

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
      <div
        className={`flex flex-col items-center gap-1 rounded-xl border p-6 ${
          streak > 0 ? "border-success/40 bg-success/5" : ""
        }`}
      >
        <span className="text-4xl">{streak > 0 ? "🔥" : "🌱"}</span>
        <span
          className={`text-4xl font-bold ${streak > 0 ? "text-success" : ""}`}
        >
          {formatNumber(streak)}
        </span>
        <span className="text-sm text-muted-foreground">
          {streak > 0 ? "روز پشت‌سرهم" : "امروز شروع کن"}
        </span>
        <span className="mt-1 text-center text-xs text-muted-foreground/80">
          روزهایی که <span className="font-medium">همهٔ</span> تسک‌های آن روز را
          انجام داده‌ای. روزِ بدون تسک استریک را نمی‌شکند.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl border p-4">
          <span className="text-xs text-muted-foreground">بهترین استریک</span>
          <span className="text-xl font-semibold">{formatNumber(best)} روز</span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border p-4">
          <span className="text-xs text-muted-foreground">۳۰ روز اخیر</span>
          <span className="text-xl font-semibold">٪{formatNumber(rate30)}</span>
        </div>
      </div>

      {/* نوار ۱۴ روز اخیر */}
      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">۱۴ روز اخیر</span>
          <span className="text-xs text-muted-foreground">
            هر مربع یک روز است. سبز یعنی همهٔ تسک‌های آن روز انجام شده.
          </span>
        </div>

        {/* ۷ ستون در هر ردیف: روی موبایل هم جا می‌شود و از قاب بیرون نمی‌زند */}
        <div className="grid grid-cols-7 gap-1.5">
          {strip.map((stat) => {
            const state = dayState(stat);
            const isToday = stat.day === todayKey;

            return (
              <div key={stat.day} className="flex min-w-0 flex-col items-center gap-1">
                <div
                  aria-label={`${stat.day}: ${stat.completed} از ${stat.total}`}
                  className={`flex aspect-square w-full items-center justify-center rounded-lg text-[11px] font-medium tabular-nums ${
                    isToday ? "outline-2 outline-foreground" : ""
                  } ${
                    state === "done"
                      ? "bg-success text-white"
                      : state === "partial"
                        ? "bg-success/25 text-success"
                        : "border border-dashed border-muted-foreground/30 text-muted-foreground/50"
                  }`}
                >
                  {state === "done" ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : state === "partial" ? (
                    `${stat.completed}/${stat.total}`
                  ) : (
                    "—"
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/70">
                  {formatDayNumber(new Date(`${stat.day}T00:00:00`))}
                </span>
              </div>
            );
          })}
        </div>

        {/* راهنما — بدون این، مربع‌ها معنایی ندارند */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-success" />
            همه انجام شد
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-success/25" />
            ناقص
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-dashed border-muted-foreground/30" />
            تسکی نبود
          </span>
        </div>
      </div>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        مجموع تسک‌های انجام‌شده در {HISTORY_DAYS} روز: {formatNumber(totalDone)}
      </p>
    </div>
  );
}
