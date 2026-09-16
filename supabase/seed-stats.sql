-- دادهٔ نمونهٔ ۳۰ روز گذشته برای تست صفحهٔ آمار و استریک.
-- ایمیل پایین را عوض کنید و در SQL Editor اجرا کنید.
--
-- الگوی ساخته‌شده (i = چند روز قبل):
--   i=30..21  کامل   → استریک ۱۰ روزه
--   i=20      نیمه‌کاره (می‌شکند)
--   i=19..8   کامل   → بهترین استریک ۱۲ روزه
--   i=7       نیمه‌کاره (می‌شکند)
--   i=6..1    کامل   → استریک فعلی ۶ روزه
--
-- انتظار: استریک فعلی ۶، بهترین استریک ۱۲.
-- پاک کردن این داده‌ها در انتهای فایل کامنت شده است.

do $$
declare
  v_email     text := 'CHANGE-ME@example.com';  -- ← ایمیل خود را بگذارید
  v_user      uuid;
  v_household uuid;
  i           int;
  v_day       date;
begin
  select p.id, p.household_id
    into v_user, v_household
    from public.profiles p
    join auth.users u on u.id = p.id
   where u.email = v_email;

  if v_user is null then
    raise exception 'کاربری با ایمیل % پیدا نشد', v_email;
  end if;

  -- دو تسک روزانه با شروع ۳۰ روز پیش، تا در گذشته هم «موعد» داشته باشند
  if not exists (
    select 1 from public.tasks
    where assigned_to = v_user and title = 'ورزش (نمونه)'
  ) then
    insert into public.tasks (
      household_id, created_by, assigned_to, title,
      priority, source, schedule_type, weekdays, start_date
    ) values
      (v_household, v_user, v_user, 'ورزش (نمونه)',
       'medium', 'admin', 'weekly', array[0,1,2,3,4,5,6]::smallint[], current_date - 30),
      (v_household, v_user, v_user, 'مطالعه (نمونه)',
       'low', 'self', 'weekly', array[0,1,2,3,4,5,6]::smallint[], current_date - 30);
  end if;

  -- برای هر روز گذشته، تسک‌هایی که آن روز موعدشان بوده را تیک می‌زنیم.
  -- همان منطق get_daily_stats، تا با محاسبهٔ استریک هم‌خوان باشد.
  for i in reverse 30..1 loop
    v_day := current_date - i;

    if i in (20, 7) then
      -- روز نیمه‌کاره: فقط یکی از تسک‌ها
      insert into public.task_completions (task_id, date, completed_by)
      select t.id, v_day, v_user
        from public.tasks t
       where t.assigned_to = v_user
         and t.is_active
         and (t.start_date is null or t.start_date <= v_day)
         and (t.end_date   is null or t.end_date   >= v_day)
         and (
           (t.schedule_type = 'once' and t.due_date = v_day)
           or (t.schedule_type = 'weekly'
               and extract(dow from v_day)::smallint = any(t.weekdays))
         )
       order by t.created_at
       limit 1
      on conflict (task_id, date) do nothing;
    else
      -- روز کامل: همهٔ تسک‌های آن روز
      insert into public.task_completions (task_id, date, completed_by)
      select t.id, v_day, v_user
        from public.tasks t
       where t.assigned_to = v_user
         and t.is_active
         and (t.start_date is null or t.start_date <= v_day)
         and (t.end_date   is null or t.end_date   >= v_day)
         and (
           (t.schedule_type = 'once' and t.due_date = v_day)
           or (t.schedule_type = 'weekly'
               and extract(dow from v_day)::smallint = any(t.weekdays))
         )
      on conflict (task_id, date) do nothing;
    end if;
  end loop;

  raise notice 'دادهٔ ۳۰ روز گذشته ساخته شد';
end $$;

-- ---------------------------------------------------------------
-- پاک کردن دادهٔ نمونه (در صورت نیاز اجرا کنید):
--
-- delete from public.task_completions
--  where date < current_date
--    and completed_by = (select id from auth.users where email = 'CHANGE-ME@example.com');
--
-- delete from public.tasks
--  where title in ('ورزش (نمونه)', 'مطالعه (نمونه)');
-- ---------------------------------------------------------------
