import { cache } from "react";
import { createClient } from "./server";

/**
 * کاربر فعلی، فقط یک بار در هر درخواست.
 *
 * getUser() یک رفت‌وبرگشت شبکه به Supabase است (برخلاف getSession که
 * فقط کوکی را می‌خواند و قابل جعل است). layout و page هر دو لازمش
 * دارند، پس بدون cache در هر ناوبری دو بار صدا زده می‌شد.
 *
 * cache() ری‌اکت نتیجه را در همان درخواست نگه می‌دارد — نه بین
 * درخواست‌ها، پس مشکل امنیتی ندارد.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

/**
 * پروفایل کاربر فعلی، باز هم یک بار در هر درخواست.
 * ستون‌ها را همه با هم می‌گیریم تا layout و page کوئری جدا نزنند.
 */
export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, household_id, intro_seen_at")
    .eq("id", user.id)
    .single();

  if (!error) return data;

  // اگر ستون intro_seen_at هنوز مایگریت نشده باشد، کل کوئری خطا می‌دهد
  // و نبودِ پروفایل به حلقهٔ ریدایرکت می‌انجامد. بدون آن ستون دوباره
  // تلاش می‌کنیم.
  const { data: fallback } = await supabase
    .from("profiles")
    .select("id, display_name, role, household_id")
    .eq("id", user.id)
    .single();

  return fallback ? { ...fallback, intro_seen_at: null } : null;
});
