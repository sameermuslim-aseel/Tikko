/**
 * خواندن متغیرهای محیطی Supabase با خطای واضح.
 * بدون این، نبودِ .env.local به‌صورت خطای مبهم "Invalid URL" ظاهر می‌شود.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `متغیر محیطی ${name} تعریف نشده است. فایل .env.local را از روی .env.local.example بسازید.`,
    );
  }
  return value;
}

export function supabaseEnv() {
  return {
    url: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    key: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}
