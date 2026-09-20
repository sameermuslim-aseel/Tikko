import { createClient } from "@/lib/supabase/client";
import type {
  AssignmentType,
  Priority,
  ScheduleType,
  TaskForDate,
  TaskSource,
  TaskType,
} from "@/lib/types";

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

  // همیشه اول ردیف قبلی پاک می‌شود. ممکن است status='skipped' باشد و
  // insert مستقیم به unique (task_id, date) بخورد.
  const { error: deleteError } = await supabase
    .from("task_completions")
    .delete()
    .eq("task_id", params.taskId)
    .eq("date", params.dateKey);

  if (deleteError) throw new Error(deleteError.message);

  if (!params.completed) return;

  const { error } = await supabase.from("task_completions").insert({
    task_id: params.taskId,
    date: params.dateKey,
    completed_by: params.userId,
    status: "done",
  });

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
  assignmentType: AssignmentType;
  taskType?: TaskType;
}): Promise<string> {
  const isWeekly = params.scheduleType === "weekly";
  const isShared = params.assignmentType === "shared";

  const { data, error } = await createClient().from("tasks").insert({
    household_id: params.householdId,
    created_by: params.userId,
    // تسک مشترک صاحب ندارد — قید دیتابیس هم همین را می‌خواهد
    assigned_to: isShared ? null : params.userId,
    assignment_type: params.assignmentType,
    task_type: params.taskType ?? "simple",
    title: params.title.trim(),
    category_id: params.categoryId,
    priority: params.priority,
    source: "self",
    schedule_type: params.scheduleType,
    due_date: isWeekly ? null : params.dateKey,
    weekdays: isWeekly ? params.weekdays : null,
    start_date: isWeekly ? params.dateKey : null,
  })
  .select("id")
  .single();

  if (error) throw new Error(error.message);
  return data.id as string;
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

/** کل ردیف تسک — فرم ویرایش به فیلدهایی نیاز دارد که نمای امروز برنمی‌گرداند */
export type EditableTask = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  source: TaskSource;
  assignment_type: AssignmentType;
  assigned_to: string | null;
  task_type: TaskType;
  category_id: string | null;
  schedule_type: ScheduleType;
  weekdays: number[] | null;
  due_date: string | null;
  time_of_day: string | null;
  created_by: string;
};

export async function fetchTask(taskId: string): Promise<EditableTask> {
  const { data, error } = await createClient()
    .from("tasks")
    .select(
      "id, title, description, priority, source, assignment_type, assigned_to, task_type, category_id, schedule_type, weekdays, due_date, time_of_day, created_by",
    )
    .eq("id", taskId)
    .single();

  if (error) throw new Error(error.message);
  return data as EditableTask;
}

/**
 * ویرایش تسک. RLS تصمیم می‌گیرد چه کسی اجازه دارد —
 * ادمین همه، عضو فقط تسک‌های self خودش.
 */
export async function updateTask(params: {
  taskId: string;
  title: string;
  priority: Priority;
  categoryId: string | null;
  assignmentType: AssignmentType;
  assignedTo: string | null;
  scheduleType: ScheduleType;
  weekdays: number[];
  dueDate: string | null;
}): Promise<void> {
  const isWeekly = params.scheduleType === "weekly";
  const isShared = params.assignmentType === "shared";

  const { error } = await createClient()
    .from("tasks")
    .update({
      title: params.title.trim(),
      priority: params.priority,
      category_id: params.categoryId,
      assignment_type: params.assignmentType,
      assigned_to: isShared ? null : params.assignedTo,
      schedule_type: params.scheduleType,
      weekdays: isWeekly ? params.weekdays : null,
      due_date: isWeekly ? null : params.dueDate,
    })
    .eq("id", params.taskId);

  if (error) throw new Error(error.message);
}

export const taskQueryKey = (taskId: string) => ["task", taskId] as const;
