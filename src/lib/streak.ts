export type DailyStat = {
  day: string; // yyyy-MM-dd
  total: number;
  completed: number;
};

/** روزی «کامل» است که همهٔ تسک‌های موعدش انجام شده باشند */
function isComplete(stat: DailyStat): boolean {
  return stat.total > 0 && stat.completed >= stat.total;
}

/**
 * استریک فعلی: تعداد روزهای پشت‌سرهم کامل، از امروز به عقب.
 *
 * دو قاعدهٔ مهم:
 *  - روزهای بدون تسک (total=0) استریک را نمی‌شکنند، فقط رد می‌شوند.
 *    وگرنه یک جمعهٔ خالی زحمت یک ماه را از بین می‌برد.
 *  - اگر امروز هنوز کامل نشده، استریک نمی‌شکند؛ روز هنوز تمام نشده است.
 *    فقط از دیروز به عقب شمرده می‌شود.
 */
export function currentStreak(stats: DailyStat[], todayKey: string): number {
  const ordered = [...stats].sort((a, b) => b.day.localeCompare(a.day));

  let streak = 0;

  for (const stat of ordered) {
    if (stat.day > todayKey) continue; // روزهای آینده
    if (stat.total === 0) continue; // روز خالی: خنثی

    if (isComplete(stat)) {
      streak += 1;
      continue;
    }

    // امروزِ ناتمام هنوز شکست نیست
    if (stat.day === todayKey) continue;

    break;
  }

  return streak;
}

/** بلندترین استریک در بازهٔ داده‌شده */
export function bestStreak(stats: DailyStat[]): number {
  const ordered = [...stats].sort((a, b) => a.day.localeCompare(b.day));

  let best = 0;
  let running = 0;

  for (const stat of ordered) {
    if (stat.total === 0) continue; // خنثی

    if (isComplete(stat)) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }

  return best;
}

/** درصد انجام در کل بازه */
export function completionRate(stats: DailyStat[]): number {
  const total = stats.reduce((sum, s) => sum + s.total, 0);
  if (total === 0) return 0;

  const completed = stats.reduce((sum, s) => sum + s.completed, 0);
  return Math.round((completed / total) * 100);
}
