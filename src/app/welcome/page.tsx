import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IntroCarousel } from "@/components/intro/intro-carousel";

/**
 * آموزش اولیه — قبل از onboarding نشان داده می‌شود، چون کاربر تازه
 * هنوز نمی‌داند «خانواده» یعنی چه و ادمین با عضو چه فرقی دارد.
 *
 * بیرون از گروه (app) است تا هدر و نوار پایین را نداشته باشد.
 */
export default async function WelcomePage({
  searchParams,
}: PageProps<"/welcome">) {
  // ?replay=1 یعنی کاربر خودش از دکمهٔ «؟» آمده، نه اولین ورود
  const replay = "replay" in (await searchParams);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  const { data: intro } = await supabase
    .from("profiles")
    .select("intro_seen_at")
    .eq("id", user.id)
    .single();

  // وقتی خودش دکمهٔ راهنما را زده، حتی اگر قبلاً دیده باشد نشان بده.
  // ستون نبودن (migration اجرا نشده) هم نباید راه را ببندد.
  if (!replay && (!intro || intro.intro_seen_at)) {
    redirect(profile?.household_id ? "/" : "/onboarding");
  }

  return (
    <IntroCarousel
      userId={user.id}
      hasHousehold={Boolean(profile?.household_id)}
    />
  );
}
