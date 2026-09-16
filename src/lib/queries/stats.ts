import { createClient } from "@/lib/supabase/client";
import type { DailyStat } from "@/lib/streak";

/** آمار روزانه در بازه — روزهای بدون تسک هم با total=0 برمی‌گردند */
export async function fetchDailyStats(
  from: string,
  to: string,
): Promise<DailyStat[]> {
  const { data, error } = await createClient().rpc("get_daily_stats", {
    p_from: from,
    p_to: to,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as DailyStat[];
}

export const statsQueryKey = (from: string, to: string) =>
  ["stats", from, to] as const;
