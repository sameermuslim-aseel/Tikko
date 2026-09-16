import { createClient } from "@/lib/supabase/server";
import { WeekView } from "@/components/week/week-view";

/** نمای هفتگی — شنبه تا جمعه (فاز ۲) */
export default async function WeekPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <header className="px-4">
        <h1 className="text-xl font-bold">هفته</h1>
      </header>

      <WeekView userId={user!.id} />
    </div>
  );
}
