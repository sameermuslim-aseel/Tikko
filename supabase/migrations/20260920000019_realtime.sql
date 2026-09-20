-- ریل‌تایم برای کل اپ
--
-- Supabase تغییرات جدول‌ها را فقط وقتی پخش می‌کند که جدول در
-- publication مخصوص realtime باشد. اینجا جدول‌هایی را اضافه می‌کنیم
-- که تغییرشان باید فوراً در موبایل طرف مقابل دیده شود.
--
-- امنیت: Postgres Changes قوانین RLS را رعایت می‌کند — هر کس فقط
-- تغییر ردیف‌هایی را می‌گیرد که اجازهٔ دیدنشان را دارد. پس عضو یک
-- خانواده از تغییرات خانوادهٔ دیگر خبردار نمی‌شود.

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'tasks',
    'task_completions',
    'categories',
    'profiles'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = v_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I', v_table
      );
    end if;
  end loop;
end $$;
