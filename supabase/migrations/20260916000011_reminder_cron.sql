-- زمان‌بندی یادآوری‌ها با pg_cron.
-- هر ۵ دقیقه Edge Function صدا زده می‌شود؛ خود تابع تصمیم می‌گیرد
-- که برای چه کسی و چه نوع پیامی بفرستد.
--
-- قبل از اجرا، سه چیز را در داشبورد جای‌گذاری کنید (پایین علامت‌گذاری شده):
--   PROJECT_REF  — شناسهٔ پروژه
--   CRON_SECRET  — همان مقداری که در secrets تابع گذاشته‌اید

create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;

-- اگر قبلاً ساخته شده، دوباره ساخته نشود
select cron.unschedule('tikko-send-reminders')
where exists (
  select 1 from cron.job where jobname = 'tikko-send-reminders'
);

select cron.schedule(
  'tikko-send-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', 'CRON_SECRET'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- برای دیدن وضعیت:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 20;
