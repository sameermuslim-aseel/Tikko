import Link from "next/link";
import { Bell, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { QueryProvider } from "@/components/providers/query-provider";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, household_id")
    .eq("id", user.id)
    .single();

  if (!profile?.household_id) redirect("/onboarding");

  return (
    // موبایل‌اول: روی دسکتاپ هم یک ستون به عرض موبایل بماند، وسط‌چین
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col border-x">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">{profile.display_name}</span>
        <span className="flex items-center gap-3">
          <Link
            href="/notifications"
            aria-label="نوتیفیکیشن‌ها"
            className="text-muted-foreground"
          >
            <Bell className="size-5" />
          </Link>
          <Link
            href="/settings"
            aria-label="تنظیمات"
            className="text-muted-foreground"
          >
            <Settings className="size-5" />
          </Link>
          <SignOutButton />
        </span>
      </header>
      <QueryProvider>
        {children}
        <BottomNav role={profile.role} />
      </QueryProvider>
    </div>
  );
}
