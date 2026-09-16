-- متن نوتیفیکیشن‌ها ذخیره شود تا در خود اپ هم قابل دیدن باشند.
-- تا حالا فقط نوع و تاریخ نگه داشته می‌شد که برای جلوگیری از ارسال
-- تکراری کافی بود، ولی برای نمایش لیست کافی نیست.

alter table public.notification_log
  add column if not exists title text,
  add column if not exists body  text,
  add column if not exists read_at timestamptz;

create index if not exists notification_log_user_sent_idx
  on public.notification_log (user_id, sent_at desc);

-- کاربر باید بتواند «خوانده شد» را علامت بزند
revoke update on public.notification_log from authenticated;
grant update (read_at) on public.notification_log to authenticated;

drop policy if exists "notification_log_update_own" on public.notification_log;

create policy "notification_log_update_own"
  on public.notification_log for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
