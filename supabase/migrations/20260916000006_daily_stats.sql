-- آمار روزانهٔ یک کاربر در یک بازه (فاز ۲ — استریک و آمار).
-- برای هر روز: چند تسک موعدش بود و چندتا انجام شد.
-- روزهای بدون تسک با total=0 برمی‌گردند تا در محاسبهٔ استریک
-- بتوان آن‌ها را «خنثی» در نظر گرفت، نه «شکست».
--
-- SECURITY INVOKER: RLS اعمال می‌شود.

create or replace function public.get_daily_stats(
  p_from date,
  p_to   date,
  p_user uuid default null
)
returns table (
  day       date,
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
    select t.id as task_id, d.day
    from public.tasks t
    cross join days d
    where t.is_active
      and t.assigned_to = coalesce(p_user, auth.uid())
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
    d.day,
    count(o.task_id)::bigint as total,
    count(tc.id)::bigint     as completed
  from days d
  left join occurrences o
    on o.day = d.day
  left join public.task_completions tc
    on tc.task_id = o.task_id and tc.date = d.day
  group by d.day
  order by d.day;
$$;

revoke all on function public.get_daily_stats(date, date, uuid) from public, anon;
grant execute on function public.get_daily_stats(date, date, uuid) to authenticated;
