-- صفحهٔ آموزش اولیه فقط یک بار، بعد از اولین ورود، نشان داده می‌شود.
-- زمان دیدن ذخیره می‌شود تا دفعهٔ بعد مستقیم برود به «امروز».

alter table public.profiles
  add column if not exists intro_seen_at timestamptz;

-- کاربر باید بتواند خودش این را علامت بزند
grant update (
  display_name,
  notify_morning,
  notify_morning_at,
  notify_evening,
  notify_evening_at,
  notify_task_time,
  notify_assigned,
  intro_seen_at
) on public.profiles to authenticated;
