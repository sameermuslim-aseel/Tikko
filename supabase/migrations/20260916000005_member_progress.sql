-- پیشرفت هر عضو در یک بازهٔ تاریخ (PLAN بخش ۶، مرحلهٔ ۴).
-- تسک‌های تکراری در دیتابیس ردیف روزانه ندارند، پس با generate_series
-- برای هر روز بازه «نمونه»های تسک ساخته و با تیک‌ها جوین می‌شوند.
--
-- SECURITY INVOKER است: RLS اعمال می‌شود، یعنی ادمین فقط خانوادهٔ خودش.

create or replace function public.get_member_progress(
  p_from date,
  p_to   date
)
returns table (
  user_id   uuid,
  total     bigint,
  completed bigint
)
language sql
stable
as $$
  with days as (
    select d::date as day
    from generate_series(p_from, p_to, interval '1 day') as d
  ),
  occurrences as (
    select t.id as task_id, t.assigned_to, d.day
    from public.tasks t
    cross join days d
    where t.is_active
      and (t.start_date is null or t.start_date <= d.day)
      and (t.end_date   is null or t.end_date   >= d.day)
      and (
        (t.schedule_type = 'once' and t.due_date = d.day)
        or
        (t.schedule_type = 'weekly'
          and extract(dow from d.day)::smallint = any(t.weekdays))
      )
  )
  select
    o.assigned_to                as user_id,
    count(*)::bigint             as total,
    count(tc.id)::bigint         as completed
  from occurrences o
  left join public.task_completions tc
    on tc.task_id = o.task_id and tc.date = o.day
  group by o.assigned_to;
$$;

revoke all on function public.get_member_progress(date, date) from public, anon;
grant execute on function public.get_member_progress(date, date) to authenticated;
