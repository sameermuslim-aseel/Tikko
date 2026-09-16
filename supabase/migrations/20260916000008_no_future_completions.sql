-- تسک روزهای آینده نباید «انجام‌شده» شود؛ تا روزش نرسد قابل تیک زدن نیست.
-- روزهای گذشته باز می‌مانند تا اگر کسی یادش رفته، بعداً تیک بزند.
--
-- نکتهٔ زمان: سرور سوپابیس روی UTC است. با current_date ساده، بین
-- نیمه‌شب و ۴:۳۰ صبح به وقت کابل هنوز «دیروز» حساب می‌شد و تیکِ امروز
-- رد می‌شد. برای همین صریحاً به وقت کابل مقایسه می‌کنیم.

drop policy if exists "completions_insert" on public.task_completions;

create policy "completions_insert"
  on public.task_completions for insert
  to authenticated
  with check (
    completed_by = auth.uid()
    and date <= (now() at time zone 'Asia/Kabul')::date
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.assigned_to = auth.uid() or public.is_admin())
    )
  );
