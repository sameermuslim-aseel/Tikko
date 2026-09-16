import { createClient } from "@/lib/supabase/client";

export type NotificationSettings = {
  notify_morning: boolean;
  notify_morning_at: string; // HH:MM
  notify_evening: boolean;
  notify_evening_at: string;
  notify_task_time: boolean;
  notify_assigned: boolean;
};

/** ورودی input[type=time] «HH:MM» است ولی Postgres «HH:MM:SS» می‌دهد */
export function toTimeInput(value: string): string {
  return value.slice(0, 5);
}

export async function saveNotificationSettings(
  userId: string,
  settings: NotificationSettings,
): Promise<void> {
  const { error } = await createClient()
    .from("profiles")
    .update({
      notify_morning: settings.notify_morning,
      notify_morning_at: settings.notify_morning_at,
      notify_evening: settings.notify_evening,
      notify_evening_at: settings.notify_evening_at,
      notify_task_time: settings.notify_task_time,
      notify_assigned: settings.notify_assigned,
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}
