import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/**
 * کلاینت Supabase برای Server Components و Server Actions.
 * در Next 16 تابع cookies() async است.
 */
export async function createClient() {
  // cookies() اول خوانده می‌شود تا Next مسیر را dynamic تشخیص دهد.
  // اگر اول env را چک کنیم و throw شود، Next سعی می‌کند صفحه را prerender کند.
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // از Server Component نمی‌شود کوکی نوشت؛
          // proxy.ts کار تازه‌سازی session را انجام می‌دهد.
        }
      },
    },
  });
}
