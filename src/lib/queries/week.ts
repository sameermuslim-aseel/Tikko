import { createClient } from "@/lib/supabase/client";
import type { Priority, TaskSource } from "@/lib/types";

/** یک «نمونه» از تسک در یک روز مشخص */
export type RangeTask = {
  day: string; // yyyy-MM-dd
  id: string;
  title: string;
  priority: Priority;
  source: TaskSource;
  time_of_day: string | null;
  category_name: string | null;
  category_color: string | null;
  is_completed: boolean;
  note: string | null;
};

export async function fetchTasksForRange(
  from: string,
  to: string,
): Promise<RangeTask[]> {
  const { data, error } = await createClient().rpc("get_tasks_for_range", {
    p_from: from,
    p_to: to,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as RangeTask[];
}

export const weekQueryKey = (from: string, to: string) =>
  ["week", from, to] as const;
