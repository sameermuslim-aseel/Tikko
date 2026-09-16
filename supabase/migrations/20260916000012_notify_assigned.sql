-- یادآوری هنگام تعیین تسک جدید توسط ادمین (فاز ۲).
-- بدون این، عضو تا خلاصهٔ شب یا صبح خبر نمی‌شد.

-- نوع جدید پیام در گزارش ارسال
alter table public.notification_log
  drop constraint if exists notification_log_kind_check;

alter table public.notification_log
  add constraint notification_log_kind_check
  check (kind in ('morning', 'evening', 'task', 'assigned'));

-- تنظیم کاربر
alter table public.profiles
  add column if not exists notify_assigned boolean not null default true;

grant update (
  display_name,
  notify_morning,
  notify_morning_at,
  notify_evening,
  notify_evening_at,
  notify_task_time,
  notify_assigned
) on public.profiles to authenticated;
