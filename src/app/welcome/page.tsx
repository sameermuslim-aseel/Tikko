import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IntroCarousel } from "@/components/intro/intro-carousel";

/**
 * آموزش اولیه — بیرون از گروه (app) است تا هدر و نوار پایین را نداشته باشد.
 * proxy.ts کاربر ناشناس را قبلاً رد کرده.
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

  // هنوز عضو خانواده‌ای نیست → اول onboarding
  if (!profile?.household_id) redirect("/onboarding");

  const { data: intro } = await supabase
    .from("profiles")
    .select("intro_seen_at")
    .eq("id", user.id)
    .single();

  // وقتی خودش دکمهٔ راهنما را زده، حتی اگر قبلاً دیده باشد نشان بده
  if (!replay && (!intro || intro.intro_seen_at)) redirect("/");

  return <IntroCarousel userId={user.id} />;
}
