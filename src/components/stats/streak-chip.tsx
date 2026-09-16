"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { fetchDailyStats, statsQueryKey } from "@/lib/queries/stats";
import { currentStreak } from "@/lib/streak";
import { formatNumber, toDateKey } from "@/lib/date";

// همان بازهٔ صفحهٔ آمار تا کوئری بین دو صفحه مشترک و کش‌شده بماند
const HISTORY_DAYS = 90;

export function StreakChip() {
  const today = new Date();
  const todayKey = toDateKey(today);
  const fromKey = toDateKey(addDays(today, -(HISTORY_DAYS - 1)));

  const { data: stats } = useQuery({
    queryKey: statsQueryKey(fromKey, todayKey),
    queryFn: () => fetchDailyStats(fromKey, todayKey),
  });

  // تا وقتی داده نیامده چیزی نشان نده — پرش لِی‌اوت بهتر از عدد اشتباه است
  if (!stats) return null;

  const streak = currentStreak(stats, todayKey);

  return (
    <Link
      href="/stats"
      aria-label={`استریک ${streak} روزه — دیدن آمار`}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
        streak > 0
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "text-muted-foreground"
      }`}
    >
      <span>{streak > 0 ? "🔥" : "🌱"}</span>
      <span className="font-medium tabular-nums">{formatNumber(streak)}</span>
    </Link>
  );
}
