-- «تسک‌های یک روز» — منطق کلیدی PLAN.md بخش ۴:
-- تسک‌های تکراری در دیتابیس تکثیر نمی‌شوند. برای هر تاریخ، تسک‌های weekly
-- که آن روز هفته در weekdays آن‌هاست + تسک‌های once با due_date همان روز
-- خوانده و با task_completions جوین می‌شوند.
--
-- SECURITY INVOKER (پیش‌فرض) است، پس RLS اعمال می‌شود:
-- عضو فقط تسک‌های خودش، ادمین تسک‌های کل خانواده.

create or replace function public.get_tasks_for_date(
  p_date date,
  p_user uuid default null
)
returns table (
  id             uuid,
  title          text,
  description    text,
  priority       text,
  source         text,
  time_of_day    time,
  assigned_to    uuid,
  category_id    uuid,
  category_name  text,
  category_color text,
  is_completed   boolean
)
language sql
stable
as $$
  select
    t.id,
    t.title,
    t.description,
    t.priority,
    t.source,
    t.time_of_day,
    t.assigned_to,
    t.category_id,
    c.name  as category_name,
    c.color as category_color,
    (tc.id is not null) as is_completed
  from public.tasks t
  left join public.categories c
    on c.id = t.category_id
  left join public.task_completions tc
    on tc.task_id = t.id and tc.date = p_date
  where t.is_active
    and t.assigned_to = coalesce(p_user, auth.uid())
    -- بازهٔ اعتبار تکرار
    and (t.start_date is null or t.start_date <= p_date)
    and (t.end_date   is null or t.end_date   >= p_date)
    and (
      (t.schedule_type = 'once' and t.due_date = p_date)
      or
      -- extract(dow) در Postgres: 0=یکشنبه … 6=شنبه (همان قرارداد PLAN)
      (t.schedule_type = 'weekly'
        and extract(dow from p_date)::smallint = any(t.weekdays))
    )
  order by
    -- ناتمام‌ها بالا، سپس اولویت بالا، سپس ساعت
    (tc.id is not null),
    case t.priority when 'high' then 0 when 'medium' then 1 else 2 end,
    t.time_of_day nulls last,
    t.created_at;
$$;

revoke all on function public.get_tasks_for_date(date, uuid) from public, anon;
grant execute on function public.get_tasks_for_date(date, uuid) to authenticated;
