-- زیرساخت نوتیفیکیشن پوش (فاز ۲).
-- سه نوع یادآوری: صبح، شب (اگر ناتمام مانده)، و سر ساعت خود تسک.

-- ---------------------------------------------------------------
-- اشتراک‌های پوش مرورگر
-- هر دستگاه یک endpoint دارد، پس یک کاربر می‌تواند چند ردیف داشته باشد.
-- ---------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy "push_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "push_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- تنظیمات یادآوری هر کاربر
-- ساعت‌ها به وقت کابل تفسیر می‌شوند (سرور UTC است).
-- ---------------------------------------------------------------
alter table public.profiles
  add column if not exists notify_morning    boolean not null default true,
  add column if not exists notify_morning_at time    not null default '08:00',
  add column if not exists notify_evening    boolean not null default true,
  add column if not exists notify_evening_at time    not null default '20:00',
  add column if not exists notify_task_time  boolean not null default false;

-- کاربر باید بتواند تنظیمات خودش را عوض کند (grant ستونی مثل display_name)
grant update (
  display_name,
  notify_morning,
  notify_morning_at,
  notify_evening,
  notify_evening_at,
  notify_task_time
) on public.profiles to authenticated;

-- ---------------------------------------------------------------
-- گزارش ارسال — جلوی ارسال تکراری را می‌گیرد
-- cron هر چند دقیقه اجرا می‌شود؛ بدون این، یک یادآوری بارها می‌رفت.
-- ---------------------------------------------------------------
create table if not exists public.notification_log (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  kind    text not null check (kind in ('morning', 'evening', 'task')),
  ref_id  uuid,          -- برای kind='task' شناسهٔ تسک
  date    date not null,
  sent_at timestamptz not null default now(),

  constraint notification_log_unique
    unique nulls not distinct (user_id, kind, ref_id, date)
);

alter table public.notification_log enable row level security;

create policy "notification_log_select_own"
  on public.notification_log for select
  to authenticated
  using (user_id = auth.uid());

-- نوشتن در این جدول فقط کار Edge Function با service role است،
-- پس هیچ پالیسی insert برای authenticated تعریف نمی‌شود.
