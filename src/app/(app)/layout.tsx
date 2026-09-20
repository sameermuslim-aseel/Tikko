import Link from "next/link";
import { Bell, CircleQuestionMark, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { QueryProvider } from "@/components/providers/query-provider";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { BottomNav } from "@/components/nav/bottom-nav";

/**
 * محافظ بخش اصلی اپ: کاربر باید وارد شده و عضو یک household باشد.
 * بررسی household اینجاست نه در proxy.ts — چون یک کوئری دیتابیس است.
 */
export default async function AppLayout({
  children,
}: LayoutProps<"/">) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // آموزش قبل از همه‌چیز: کاربر تازه باید اول بداند خانواده یعنی چه
  const { data: intro } = await supabase
    .from("profiles")
    .select("intro_seen_at")
    .eq("id", user.id)
    .single();

  // کوئری جدا از پایین است: اگر migration این ستون اجرا نشده باشد،
  // نباید کل کوئری پروفایل خطا بدهد و حلقهٔ ریدایرکت بسازد.
  if (intro && !intro.intro_seen_at) redirect("/welcome");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, household_id")
    .eq("id", user.id)
    .single();

  if (!profile?.household_id) redirect("/onboarding");

  // حرف اول نام برای آواتار — با [...] تا حروف چندبایتی هم درست بریده شوند
  const initial = [...(profile.display_name?.trim() ?? "")][0]?.toUpperCase() ?? "؟";

  return (
    // موبایل‌اول: روی دسکتاپ هم یک ستون به عرض موبایل بماند، وسط‌چین
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col border-x">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        {/* پروفایل: حرف اول نام در دایره، نام و نقش کنارش */}
        <Link
          href="/settings"
          className="flex min-w-0 items-center gap-2.5 rounded-lg py-1 transition-colors"
        >
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background"
          >
            {initial}
          </span>

          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium">
              {profile.display_name ?? "بی‌نام"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {profile.role === "admin" ? "ادمین" : "عضو"}
            </span>
          </span>
        </Link>

        <span className="flex shrink-0 items-center gap-1">
          <Link
            href="/welcome?replay=1"
            aria-label="راهنما"
            title="راهنما — تیکو چطور کار می‌کند"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          >
            <CircleQuestionMark className="size-5" />
          </Link>

          <Link
            href="/notifications"
            aria-label="نوتیفیکیشن‌ها"
            title="نوتیفیکیشن‌ها"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          >
            <Bell className="size-5" />
          </Link>

          <Link
            href="/settings"
            aria-label="تنظیمات"
            title="تنظیمات"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          >
            <Settings className="size-5" />
          </Link>

          <SignOutButton />
        </span>
      </header>
      <QueryProvider>
        <RealtimeProvider>
          {children}
          <BottomNav role={profile.role} />
        </RealtimeProvider>
      </QueryProvider>
    </div>
  );
}
