import { createClient } from "@/lib/supabase/client";
import type { Priority, ScheduleType, TaskForDate } from "@/lib/types";

/** تسک‌های یک روز برای کاربر جاری */
export async function fetchTasksForDate(dateKey: string): Promise<TaskForDate[]> {
  const { data, error } = await createClient().rpc("get_tasks_for_date", {
    p_date: dateKey,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as TaskForDate[];
}

/**
 * تیک زدن / برداشتن تیک.
 * هر روز رکورد جداگانه دارد، پس تیکِ امروز روی فردا اثر ندارد.
 */
export async function setTaskCompletion(params: {
  taskId: string;
  dateKey: string;
  completed: boolean;
  userId: string;
}): Promise<void> {
  const supabase = createClient();

  if (params.completed) {
    const { error } = await supabase.from("task_completions").insert({
      task_id: params.taskId,
      date: params.dateKey,
      completed_by: params.userId,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from("task_completions")
    .delete()
    .eq("task_id", params.taskId)
    .eq("date", params.dateKey);

  if (error) throw new Error(error.message);
}

/**
 * ساخت تسک شخصی. همیشه source='self' و برای خودِ کاربر.
 * RLS هم همین را اجبار می‌کند — این‌جا فقط UI را هم‌راستا نگه می‌داریم.
 */
export async function createSelfTask(params: {
  householdId: string;
  userId: string;
  title: string;
  categoryId: string | null;
  priority: Priority;
  scheduleType: ScheduleType;
  weekdays: number[];
  dateKey: string;
}): Promise<void> {
  const isWeekly = params.scheduleType === "weekly";

  const { error } = await createClient().from("tasks").insert({
    household_id: params.householdId,
    created_by: params.userId,
    assigned_to: params.userId,
    title: params.title.trim(),
    category_id: params.categoryId,
    priority: params.priority,
    source: "self",
    schedule_type: params.scheduleType,
    due_date: isWeekly ? null : params.dateKey,
    weekdays: isWeekly ? params.weekdays : null,
    start_date: isWeekly ? params.dateKey : null,
  });

  if (error) throw new Error(error.message);
}

/**
 * یادداشت روی یک تسکِ انجام‌شده در یک روز مشخص.
 * grant ستونی فقط اجازهٔ تغییر note را می‌دهد، نه task_id و date.
 */
export async function saveCompletionNote(params: {
  taskId: string;
  dateKey: string;
  note: string;
}): Promise<void> {
  const trimmed = params.note.trim();

  const { error } = await createClient()
    .from("task_completions")
    .update({ note: trimmed === "" ? null : trimmed })
    .eq("task_id", params.taskId)
    .eq("date", params.dateKey);

  if (error) throw new Error(error.message);
}

/** حذف تسک — RLS فقط برای تسک‌های self خودِ کاربر (یا ادمین) اجازه می‌دهد */
export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await createClient().from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
}

export const tasksQueryKey = (dateKey: string) => ["tasks", dateKey] as const;
