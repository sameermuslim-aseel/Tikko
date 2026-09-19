import { createClient } from "@/lib/supabase/client";
import type { Priority, ScheduleType, TaskSource } from "@/lib/types";

/** یک تسک بلاتکلیف از روزهای گذشته */
export type OverdueTask = {
  day: string; // yyyy-MM-dd — روزی که موعدش بوده
  id: string;
  title: string;
  priority: Priority;
  source: TaskSource;
  schedule_type: ScheduleType;
  category_name: string | null;
  category_color: string | null;
};

export async function fetchOverdueTasks(): Promise<OverdueTask[]> {
  const { data, error } = await createClient().rpc("get_overdue_tasks", {
    p_days: 14,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as OverdueTask[];
}

/** «انجام شد» — تیک با تاریخِ همان روز گذشته، نه امروز */
export async function completeOverdue(params: {
  taskId: string;
  day: string;
  userId: string;
}): Promise<void> {
  const { error } = await createClient().from("task_completions").insert({
    task_id: params.taskId,
    date: params.day,
    completed_by: params.userId,
    status: "done",
  });

  if (error) throw new Error(error.message);
}

/** «رد شد» — تصمیم آگاهانه، نه فراموشی */
export async function skipOverdue(params: {
  taskId: string;
  day: string;
  userId: string;
  note?: string;
}): Promise<void> {
  const { error } = await createClient().from("task_completions").insert({
    task_id: params.taskId,
    date: params.day,
    completed_by: params.userId,
    status: "skipped",
    note: params.note?.trim() || null,
  });

  if (error) throw new Error(error.message);
}

/** «امروز انجام می‌دهم» — منطقش در RPC است چون به نوع زمان‌بندی بستگی دارد */
export async function deferToToday(params: {
  taskId: string;
  day: string;
}): Promise<void> {
  const { error } = await createClient().rpc("defer_task_to_today", {
    p_task_id: params.taskId,
    p_date: params.day,
  });

  if (error) throw new Error(error.message);
}

export const overdueQueryKey = ["overdue"] as const;
