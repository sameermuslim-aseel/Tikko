import { createClient } from "@/lib/supabase/client";

export type NotificationKind = "morning" | "evening" | "task" | "assigned";

export type NotificationRow = {
  id: string;
  kind: NotificationKind;
  title: string | null;
  body: string | null;
  sent_at: string;
  read_at: string | null;
};

/** نوتیفیکیشن‌های خود کاربر — RLS بقیه را نشان نمی‌دهد */
export async function fetchNotifications(): Promise<NotificationRow[]> {
  const { data, error } = await createClient()
    .from("notification_log")
    .select("id, kind, title, body, sent_at, read_at")
    .order("sent_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationRow[];
}

/** همه را خوانده‌شده علامت بزن */
export async function markAllRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const { error } = await createClient()
    .from("notification_log")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);

  if (error) throw new Error(error.message);
}

export const notificationsQueryKey = ["notifications"] as const;
