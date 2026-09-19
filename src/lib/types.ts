export type Priority = "low" | "medium" | "high";
export type TaskSource = "admin" | "self";
export type ScheduleType = "once" | "weekly";
export type Role = "admin" | "member";
export type CompletionStatus = "done" | "skipped";
/** یک‌نفره یا مشترک («هر کی زودتر») */
export type AssignmentType = "one" | "shared";

/** خروجی تابع get_tasks_for_date */
export type TaskForDate = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  source: TaskSource;
  time_of_day: string | null;
  assigned_to: string | null;
  assignment_type: AssignmentType;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  is_completed: boolean;
  note: string | null;
  status: CompletionStatus | null;
  /** اگر از روز دیگری به امروز منتقل شده، تاریخ اصلی */
  deferred_from: string | null;
  /** برای تسک مشترک: چه کسی زودتر انجامش داد */
  completed_by_name: string | null;
};
