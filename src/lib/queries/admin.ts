import { createClient } from "@/lib/supabase/client";
import type {
  AssignmentType,
  Priority,
  Role,
  ScheduleType,
  TaskType,
} from "@/lib/types";

export type Member = {
  id: string;
  display_name: string | null;
  role: Role;
};

export type AdminTask = {
  id: string;
  title: string;
  assigned_to: string | null;
  assignment_type: AssignmentType;
  task_type: TaskType;
  category_id: string | null;
  priority: Priority;
  source: "admin" | "self";
  schedule_type: ScheduleType;
  weekdays: number[] | null;
  due_date: string | null;
  is_active: boolean;
};

export type MemberProgress = {
  user_id: string;
  total: number;
  completed: number;
};

/** اعضای خانواده — RLS خودش به household جاری محدود می‌کند */
export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await createClient()
    .from("profiles")
    .select("id, display_name, role")
    .order("created_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as Member[];
}

/**
 * همهٔ تسک‌های فعال خانواده. عمداً بدون embed خوانده می‌شود —
 * supabase-js رابطه‌های embed را آرایه تایپ می‌کند و اسم‌ها را
 * ساده‌تر است در UI از members/categories وصل کنیم.
 */
export async function fetchAdminTasks(): Promise<AdminTask[]> {
  const { data, error } = await createClient()
    .from("tasks")
    .select(
      "id, title, assigned_to, assignment_type, task_type, category_id, priority, source, schedule_type, weekdays, due_date, is_active",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminTask[];
}

export async function fetchMemberProgress(
  from: string,
  to: string,
): Promise<MemberProgress[]> {
  const { data, error } = await createClient().rpc("get_member_progress", {
    p_from: from,
    p_to: to,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as MemberProgress[];
}

/** تسک تعیین‌شده توسط ادمین (source='admin') */
export async function createAdminTask(params: {
  householdId: string;
  createdBy: string;
  assignedTo: string | null;
  title: string;
  categoryId: string | null;
  priority: Priority;
  scheduleType: ScheduleType;
  weekdays: number[];
  dateKey: string;
  assignmentType: AssignmentType;
  taskType?: TaskType;
}): Promise<void> {
  const isWeekly = params.scheduleType === "weekly";
  const isShared = params.assignmentType === "shared";

  const { error } = await createClient().from("tasks").insert({
    household_id: params.householdId,
    created_by: params.createdBy,
    assigned_to: isShared ? null : params.assignedTo,
    assignment_type: params.assignmentType,
    task_type: params.taskType ?? "simple",
    title: params.title.trim(),
    category_id: params.categoryId,
    priority: params.priority,
    source: "admin",
    schedule_type: params.scheduleType,
    due_date: isWeekly ? null : params.dateKey,
    weekdays: isWeekly ? params.weekdays : null,
    start_date: isWeekly ? params.dateKey : null,
  });

  if (error) throw new Error(error.message);
}

export async function createCategory(params: {
  householdId: string;
  name: string;
  color: string;
}): Promise<void> {
  const { error } = await createClient().from("categories").insert({
    household_id: params.householdId,
    name: params.name.trim(),
    color: params.color,
  });

  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await createClient().from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export const adminKeys = {
  members: ["admin", "members"] as const,
  tasks: ["admin", "tasks"] as const,
  progress: (from: string, to: string) => ["admin", "progress", from, to] as const,
};
