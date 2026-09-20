"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * یک اتصال زنده برای کل اپ.
 *
 * به‌جای اینکه هر صفحه ریل‌تایم خودش را داشته باشد، اینجا به تغییر
 * جدول‌ها گوش می‌دهیم و به TanStack Query می‌گوییم کش را تازه کند.
 * چون همهٔ صفحات از همان کش می‌خوانند، همه با هم زنده می‌شوند:
 * امروز، هفته، آمار، داشبورد و عقب‌افتاده‌ها.
 *
 * RLS روی Postgres Changes هم اعمال می‌شود، پس فقط تغییرات خانوادهٔ
 * خود کاربر می‌رسد.
 */
const WATCHED_TABLES = [
  "tasks",
  "task_completions",
  "categories",
  "profiles",
] as const;

// وقتی یک نفر چند آیتم را پشت سر هم عوض می‌کند، ده‌ها رویداد می‌آید.
// این تأخیر کوتاه همه را یکجا می‌کند تا اپ بی‌جهت کوئری نزند.
const BATCH_DELAY_MS = 250;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function refreshSoon() {
      if (timer) clearTimeout(timer);

      timer = setTimeout(() => {
        // کلیدهایی که به دادهٔ خانواده وابسته‌اند
        for (const key of [
          ["tasks"],
          ["week"],
          ["stats"],
          ["overdue"],
          ["admin"],
          ["categories"],
          ["households"],
        ]) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }, BATCH_DELAY_MS);
    }

    const channel = supabase.channel("tikko-household");

    for (const table of WATCHED_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        refreshSoon,
      );
    }

    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      // بدون این، هر بار که کاربر بین صفحات برود یک کانال باز می‌ماند
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return <>{children}</>;
}
