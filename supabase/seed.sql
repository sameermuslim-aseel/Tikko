-- دادهٔ نمونه برای تست مرحلهٔ ۲ (نمای «امروز»).
-- در SQL Editor اجرا کنید. ایمیل پایین را به ایمیل خودتان تغییر دهید.
-- این فایل migration نیست — هر بار اجرا شود، داده تکرار می‌شود.

do $$
declare
  v_email     text := 'CHANGE-ME@example.com';  -- ← ایمیل خود را اینجا بگذارید
  v_user      uuid;
  v_household uuid;
  v_cat_home  uuid;
  v_cat_shop  uuid;
begin
  select p.id, p.household_id
    into v_user, v_household
    from public.profiles p
    join auth.users u on u.id = p.id
   where u.email = v_email;

  if v_user is null then
    raise exception 'کاربری با ایمیل % پیدا نشد', v_email;
  end if;

  if v_household is null then
    raise exception 'این کاربر عضو هیچ خانواده‌ای نیست';
  end if;

  insert into public.categories (household_id, name, color, icon)
  values (v_household, 'خانه', '#3b82f6', 'house')
  returning id into v_cat_home;

  insert into public.categories (household_id, name, color, icon)
  values (v_household, 'خرید', '#10b981', 'shopping-cart')
  returning id into v_cat_shop;

  -- تکراری: هر روز هفته
  insert into public.tasks (
    household_id, created_by, assigned_to, title, category_id,
    priority, source, schedule_type, weekdays, start_date, time_of_day
  ) values (
    v_household, v_user, v_user, 'ورزش صبحگاهی', v_cat_home,
    'high', 'admin', 'weekly', array[0,1,2,3,4,5,6]::smallint[], current_date, '07:00'
  );

  -- تکراری: فقط چند روز هفته (0=یکشنبه … 6=شنبه)
  insert into public.tasks (
    household_id, created_by, assigned_to, title, category_id,
    priority, source, schedule_type, weekdays, start_date
  ) values (
    v_household, v_user, v_user, 'جمع کردن آشپزخانه', v_cat_home,
    'medium', 'admin', 'weekly', array[0,2,4]::smallint[], current_date
  );

  -- یک‌بار: فقط امروز
  insert into public.tasks (
    household_id, created_by, assigned_to, title, category_id,
    priority, source, schedule_type, due_date
  ) values (
    v_household, v_user, v_user, 'خرید نان', v_cat_shop,
    'low', 'self', 'once', current_date
  );

  raise notice 'داده نمونه ساخته شد';
end $$;
