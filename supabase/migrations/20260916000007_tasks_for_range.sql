-- تسک‌های یک بازهٔ تاریخ، همراه با روزی که موعدشان است (فاز ۲ — نمای هفتگی).
-- همان منطق get_tasks_for_date ولی برای چند روز در یک کوئری،
-- تا نمای هفتگی به‌جای ۷ درخواست، یکی بزند.
--
-- SECURITY INVOKER: RLS اعمال می‌شود.

create or replace function public.get_tasks_for_range(
  p_from date,
  p_to   date,
  p_user uuid default null
)
returns table (
  day            date,
  id             uuid,
  title          text,
  priority       text,
  source         text,
  time_of_day    time,
  category_name  text,
  category_color text,
  is_completed   boolean
)
language sql
stable
as $$
  with days as (
    select d::date as day
    from generate_series(p_from, p_to, interval '1 day') as d
  )
  select
    d.day,
    t.id,
    t.title,
    t.priority,
    t.source,
    t.time_of_day,
    c.name  as category_name,
    c.color as category_color,
    (tc.id is not null) as is_completed
  from days d
  join public.tasks t
    on t.is_active
   and t.assigned_to = coalesce(p_user, auth.uid())
   and (t.start_date is null or t.start_date <= d.day)
   and (t.end_date   is null or t.end_date   >= d.day)
   and (
     (t.schedule_type = 'once' and t.due_date = d.day)
     or
     (t.schedule_type = 'weekly'
       and extract(dow from d.day)::smallint = any(t.weekdays))
   )
  left join public.categories c
    on c.id = t.category_id
  left join public.task_completions tc
    on tc.task_id = t.id and tc.date = d.day
  order by
    d.day,
    (tc.id is not null),
    case t.priority when 'high' then 0 when 'medium' then 1 else 2 end,
    t.time_of_day nulls last;
$$;

revoke all on function public.get_tasks_for_range(date, date, uuid) from public, anon;
grant execute on function public.get_tasks_for_range(date, date, uuid) to authenticated;
