import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** کلاینت Supabase برای کامپوننت‌های client */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
