-- تسک‌های عقب‌افتاده (PLAN-PHASE2.md بخش ۲.۲)
--
-- تا حالا «انجام‌نشده» و «تصمیم گرفتم انجام ندهم» فرقی نداشتند: هر دو
-- یعنی نبودِ ردیف در task_completions. با status حالا سه حالت داریم:
--   ردیف نیست      → هنوز تکلیفش معلوم نیست (عقب‌افتاده)
--   status='done'  → انجام شد
--   status='skipped' → آگاهانه رد شد
--
-- اثر روی آمار: روز skipped شده نه در «انجام‌شده» می‌آید نه در «کل».
-- یعنی رد کردن آگاهانهٔ یک تسک، استریک را نمی‌شکند — هدف بخش ۲.۲ این
-- است که هیچ تسکی بلاتکلیف نماند، نه اینکه رد کردن جریمه داشته باشد.

alter table public.task_completions
  add column if not exists status text not null default 'done'
  check (status in ('done', 'skipped'));

-- note در مایگریشن قبلی اضافه شده بود؛ حالا دلیل skip هم در همان می‌نشیند
revoke update on public.task_completions from authenticated;
grant update (note, status) on public.task_completions to authenticated;

-- ---------------------------------------------------------------
-- تسک‌های عقب‌افتاده
-- فقط تسک‌های once و تکراری‌های high — طبق پلان، تکراری‌های low/medium
-- عقب‌افتاده نمایش داده نمی‌شوند چون لیست را شلوغ و دلسردکننده می‌کنند.
-- ---------------------------------------------------------------
create or replace function public.get_overdue_tasks(
  p_days int default 14,
  p_user uuid default null
)
returns table (
  day            date,
  id             uuid,
  title          text,
  priority       text,
  source         text,
  schedule_type  text,
  category_name  text,
  category_color text
)
language sql
stable
as $$
  with bounds as (
    select (now() at time zone 'Asia/Kabul')::date as today
  ),
  days as (
    select d::date as day
      from bounds b,
           generate_series(b.today - p_days, b.today - 1, interval '1 day') as d
  )
  select
    d.day, t.id, t.title, t.priority, t.source, t.schedule_type,
    c.name as category_name, c.color as category_color
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
       and t.priority = 'high'
       and extract(dow from d.day)::smallint = any(t.weekdays))
   )
  left join public.categories c
    on c.id = t.category_id
  left join public.task_completions tc
    on tc.task_id = t.id and tc.date = d.day
  where tc.id is null   -- نه انجام شده، نه رد شده → بلاتکلیف
  order by
    d.day desc,
    case t.priority when 'high' then 0 when 'medium' then 1 else 2 end;
$$;

revoke all on function public.get_overdue_tasks(int, uuid) from public, anon;
grant execute on function public.get_overdue_tasks(int, uuid) to authenticated;

-- ---------------------------------------------------------------
-- «امروز انجام می‌دهم»
-- روز عقب‌افتاده skipped می‌شود تا از لیست برود، و کار به امروز می‌آید.
-- تسک once جابه‌جا می‌شود؛ تکراری دست نمی‌خورد و یک کپی یک‌باره می‌گیرد،
-- وگرنه کل برنامهٔ هفتگی به هم می‌ریخت.
-- ---------------------------------------------------------------
create or replace function public.defer_task_to_today(
  p_task_id uuid,
  p_date    date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task  public.tasks;
  v_today date := (now() at time zone 'Asia/Kabul')::date;
begin
  select * into v_task from public.tasks where id = p_task_id;

  if not found then
    raise exception 'تسک پیدا نشد';
  end if;

  if v_task.assigned_to <> auth.uid() and not public.is_admin() then
    raise exception 'اجازه ندارید';
  end if;

  insert into public.task_completions (task_id, date, completed_by, status, note)
  values (p_task_id, p_date, auth.uid(), 'skipped', 'به امروز منتقل شد')
  on conflict (task_id, date) do nothing;

  if v_task.schedule_type = 'once' then
    update public.tasks set due_date = v_today where id = p_task_id;
  else
    insert into public.tasks (
      household_id, created_by, assigned_to, title, description,
      category_id, priority, source, schedule_type, due_date
    ) values (
      v_task.household_id, auth.uid(), v_task.assigned_to, v_task.title,
      v_task.description, v_task.category_id, v_task.priority, v_task.source,
      'once', v_today
    );
  end if;
end;
$$;

revoke all on function public.defer_task_to_today(uuid, date) from public, anon;
grant execute on function public.defer_task_to_today(uuid, date) to authenticated;

-- ---------------------------------------------------------------
-- توابع موجود باید status را بفهمند
-- is_completed یعنی status='done'، نه صرفاً «ردیفی هست».
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
  note           text,
  status         text
)
language sql
stable
as $$
  select
    t.id, t.title, t.description, t.priority, t.source, t.time_of_day,
    t.assigned_to, t.category_id,
    c.name as category_name, c.color as category_color,
    (tc.status = 'done') as is_completed,
    tc.note,
    tc.status
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
    (tc.status is not null),
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
  note           text,
  status         text
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
    (tc.status = 'done') as is_completed,
    tc.note,
    tc.status
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
    (tc.status is not null),
    case t.priority when 'high' then 0 when 'medium' then 1 else 2 end,
    t.time_of_day nulls last;
$$;

revoke all on function public.get_tasks_for_range(date, date, uuid) from public, anon;
grant execute on function public.get_tasks_for_range(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------
-- آمار: skipped نه در کل می‌آید نه در انجام‌شده
-- ---------------------------------------------------------------
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
    count(o.task_id) filter (
      where tc.status is distinct from 'skipped'
    )::bigint as total,
    count(*) filter (where tc.status = 'done')::bigint as completed
  from days d
  left join occurrences o on o.day = d.day
  left join public.task_completions tc
    on tc.task_id = o.task_id and tc.date = d.day
  group by d.day
  order by d.day;
$$;

revoke all on function public.get_daily_stats(date, date, uuid) from public, anon;
grant execute on function public.get_daily_stats(date, date, uuid) to authenticated;

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
    o.assigned_to as user_id,
    count(*) filter (
      where tc.status is distinct from 'skipped'
    )::bigint as total,
    count(*) filter (where tc.status = 'done')::bigint as completed
  from occurrences o
  left join public.task_completions tc
    on tc.task_id = o.task_id and tc.date = o.day
  group by o.assigned_to;
$$;

revoke all on function public.get_member_progress(date, date) from public, anon;
grant execute on function public.get_member_progress(date, date) to authenticated;
