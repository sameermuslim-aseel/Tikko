import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts کاربر ناشناس را قبلاً رد کرده؛ این فقط محافظ دوم است.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, household_id")
    .eq("id", user.id)
    .single();

  // قبلاً عضو خانواده‌ای هست → کاری برای انجام نیست
  if (profile?.household_id) redirect("/");

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <h1 className="mb-1 text-2xl font-bold">خوش آمدید</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        یک خانواده بسازید یا با کد دعوت به خانوادهٔ موجود بپیوندید.
      </p>
      <OnboardingForm defaultName={profile?.display_name ?? ""} />
    </main>
  );
}
