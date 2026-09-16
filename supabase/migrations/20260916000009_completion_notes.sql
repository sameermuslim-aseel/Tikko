-- نظر/توضیح روی تسک انجام‌شده (فاز ۲).
-- یادداشت به task_completions وصل می‌شود نه به tasks، چون مربوط به
-- «انجام‌شدن در یک روز مشخص» است، نه به تعریف تسک.

alter table public.task_completions
  add column if not exists note text;

-- ---------------------------------------------------------------
-- اجازهٔ ویرایش یادداشت
-- مثل profiles، با grant ستونی محدود می‌شود: کاربر فقط note را
-- عوض می‌کند، نه task_id یا date را.
-- ---------------------------------------------------------------
revoke update on public.task_completions from authenticated;
grant update (note) on public.task_completions to authenticated;

drop policy if exists "completions_update" on public.task_completions;

create policy "completions_update"
  on public.task_completions for update
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.assigned_to = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.assigned_to = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------
-- توابع خواندن باید note را هم برگردانند.
-- تغییر ستون‌های returns table با create or replace ممکن نیست،
-- پس اول drop می‌شوند.
-- ---------------------------------------------------------------
drop function if exists public.get_tasks_for_date(date, uuid);

create function public.get_tasks_for_date(
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
  is_completed   boolean,
  note           text
)
language sql
stable
as $$
  select
    t.id, t.title, t.description, t.priority, t.source, t.time_of_day,
    t.assigned_to, t.category_id,
    c.name as category_name, c.color as category_color,
    (tc.id is not null) as is_completed,
    tc.note
  from public.tasks t
  left join public.categories c on c.id = t.category_id
  left join public.task_completions tc
    on tc.task_id = t.id and tc.date = p_date
  where t.is_active
    and t.assigned_to = coalesce(p_user, auth.uid())
    and (t.start_date is null or t.start_date <= p_date)
    and (t.end_date   is null or t.end_date   >= p_date)
    and (
      (t.schedule_type = 'once' and t.due_date = p_date)
      or
      (t.schedule_type = 'weekly'
        and extract(dow from p_date)::smallint = any(t.weekdays))
    )
  order by
    (tc.id is not null),
    case t.priority when 'high' then 0 when 'medium' then 1 else 2 end,
    t.time_of_day nulls last,
    t.created_at;
$$;

revoke all on function public.get_tasks_for_date(date, uuid) from public, anon;
grant execute on function public.get_tasks_for_date(date, uuid) to authenticated;

drop function if exists public.get_tasks_for_range(date, date, uuid);

create function public.get_tasks_for_range(
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
  is_completed   boolean,
  note           text
)
language sql
stable
as $$
  with days as (
    select d::date as day
    from generate_series(p_from, p_to, interval '1 day') as d
  )
  select
    d.day, t.id, t.title, t.priority, t.source, t.time_of_day,
    c.name as category_name, c.color as category_color,
    (tc.id is not null) as is_completed,
    tc.note
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
  left join public.categories c on c.id = t.category_id
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
