import { createClient } from "@/lib/supabase/server";
import { NotificationSettingsForm } from "@/components/settings/notification-settings";
import type { NotificationSettings } from "@/lib/queries/settings";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "notify_morning, notify_morning_at, notify_evening, notify_evening_at, notify_task_time",
    )
    .eq("id", user!.id)
    .single();

  const initial: NotificationSettings = {
    notify_morning: profile?.notify_morning ?? true,
    notify_morning_at: profile?.notify_morning_at ?? "08:00",
    notify_evening: profile?.notify_evening ?? true,
    notify_evening_at: profile?.notify_evening_at ?? "20:00",
    notify_task_time: profile?.notify_task_time ?? false,
  };

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 pb-24">
      <header className="px-4">
        <h1 className="text-xl font-bold">تنظیمات</h1>
        <p className="text-sm text-muted-foreground">یادآوری‌ها</p>
      </header>

      <NotificationSettingsForm userId={user!.id} initial={initial} />
    </div>
  );
}
