import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/user";
import { ProgressSection } from "@/components/admin/progress-section";
import { AdminTaskList } from "@/components/admin/admin-task-list";
import { CategoryManager } from "@/components/admin/category-manager";
import { AdminTaskDrawer } from "@/components/admin/admin-task-drawer";

/** داشبورد ادمین — گارد نقش سمت سرور (PLAN بخش ۶، مرحلهٔ ۴) */
export default async function AdminPage() {
  // همان پروفایلی که layout گرفته — cache() دوباره کوئری نمی‌زند
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // عضو عادی اصلاً نباید این صفحه را ببیند.
  // RLS هم جداگانه جلوی خواندن دادهٔ بقیه را می‌گیرد.
  if (profile?.role !== "admin") redirect("/");

  const { data: household } = await supabase
    .from("households")
    .select("name, invite_code")
    .eq("id", profile.household_id)
    .single();

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header className="px-4">
        <h1 className="text-xl font-bold">{household?.name}</h1>
        <p className="text-sm text-muted-foreground">داشبورد ادمین</p>
      </header>

      <ProgressSection />

      <AdminTaskList userId={profile!.id} />

      <CategoryManager householdId={profile.household_id} />

      <section className="px-4 pb-24">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          دعوت عضو
        </h2>
        <div className="rounded-xl border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            این کد را به عضو جدید بدهید
          </p>
          <p dir="ltr" className="mt-1 font-mono text-2xl tracking-widest">
            {household?.invite_code}
          </p>
        </div>
      </section>

      <AdminTaskDrawer
        householdId={profile.household_id}
        userId={profile!.id}
      />
    </div>
  );
}
