import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/user";
import { TodayView } from "@/components/tasks/today-view";

/** نمای «امروز» — صفحهٔ اصلی (PLAN بخش ۵) */
export default async function TodayPage({ searchParams }: PageProps<"/">) {
  // میان‌بر آیکون اپ مستقیم فرم تسک جدید را باز می‌کند
  const openNewTask = "new" in (await searchParams);

  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // موقتی تا مرحلهٔ ۴ (داشبورد ادمین): کد دعوت برای اضافه کردن عضو
  const { data: household } =
    profile?.role === "admin"
      ? await supabase
          .from("households")
          .select("invite_code")
          .eq("id", profile.household_id)
          .single()
      : { data: null };

  return (
    <>
      <TodayView
        userId={profile!.id}
        householdId={profile!.household_id}
        role={profile!.role}
        openNewTask={openNewTask}
      />

      <footer className="flex flex-col gap-1 px-4 pb-6 text-center text-xs text-muted-foreground">
        {household?.invite_code && (
          <p>
            کد دعوت:{" "}
            <span dir="ltr" className="font-mono">
              {household.invite_code}
            </span>
          </p>
        )}
        <p>نقش شما: {profile?.role === "admin" ? "ادمین" : "عضو"}</p>
      </footer>
    </>
  );
}
