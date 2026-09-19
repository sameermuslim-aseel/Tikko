-- تسک مشترک «هر کی زودتر» (PLAN-PHASE2.md بخش ۲.۳)
--
-- تا حالا هر تسک دقیقاً یک صاحب داشت و همهٔ کوئری‌ها می‌گفتند
-- assigned_to = auth.uid(). تسک مشترک صاحب ندارد، پس آن شرط باید
-- همه‌جا گسترش پیدا کند وگرنه تسک مشترک برای هیچ‌کس دیده نمی‌شود.
--
-- قاعدهٔ شمارش: تسک مشترک در لیست هر دو نفر است؛ هر کس تیک زد،
-- برای هر دو انجام‌شده حساب می‌شود. وگرنه استریک یکی می‌شکست چون
-- آن یکی زودتر زباله را برد.

alter table public.tasks
  add column if not exists assignment_type text not null default 'one'
  check (assignment_type in ('one', 'shared'));

alter table public.tasks
  alter column assigned_to drop not null;

-- یک‌نفره باید صاحب داشته باشد، مشترک نباید
alter table public.tasks
  drop constraint if exists tasks_assignment_check;

alter table public.tasks
  add constraint tasks_assignment_check check (
    (assignment_type = 'one'    and assigned_to is not null)
    or
    (assignment_type = 'shared' and assigned_to is null)
  );

-- ---------------------------------------------------------------
-- کمکی: آیا این تسک به من مربوط است؟
-- در یک جا تعریف می‌شود تا شرطش در شش تابع تکرار نشود.
-- ---------------------------------------------------------------
create or replace function public.task_belongs_to_me(
  p_assigned_to     uuid,
  p_assignment_type text,
  p_household_id    uuid,
  p_user            uuid default null
)
returns boolean
language sql
stable
as $$
  select
    p_assigned_to = coalesce(p_user, auth.uid())
    or (
      p_assignment_type = 'shared'
      and p_household_id = public.current_household_id()
    );
$$;

revoke all on function public.task_belongs_to_me(uuid, text, uuid, uuid) from public, anon;
grant execute on function public.task_belongs_to_me(uuid, text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------
-- پالیسی‌های tasks
-- ---------------------------------------------------------------
drop policy if exists "tasks_select" on public.tasks;

create policy "tasks_select"
  on public.tasks for select
  to authenticated
  using (
    household_id = public.current_household_id()
    and (
      public.is_admin()
      or assigned_to = auth.uid()
      or assignment_type = 'shared'
    )
  );

drop policy if exists "tasks_insert" on public.tasks;

create policy "tasks_insert"
  on public.tasks for insert
  to authenticated
  with check (
    household_id = public.current_household_id()
    and created_by = auth.uid()
    and (
      public.is_admin()
      or (
        source = 'self'
        and (
          assigned_to = auth.uid()
          -- کار خانه مال یک نفر نیست؛ عضو هم می‌تواند مشترک بسازد
          or (assignment_type = 'shared' and assigned_to is null)
        )
      )
    )
  );

-- ---------------------------------------------------------------
-- پالیسی‌های task_completions: تسک مشترک را هر عضو می‌تواند تیک بزند
-- ---------------------------------------------------------------
drop policy if exists "completions_insert" on public.task_completions;

create policy "completions_insert"
  on public.task_completions for insert
  to authenticated
  with check (
    completed_by = auth.uid()
    -- روز آینده هنوز نرسیده (مایگریشن ۸)
    and date <= (now() at time zone 'Asia/Kabul')::date
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          t.assigned_to = auth.uid()
          or t.assignment_type = 'shared'
          or public.is_admin()
        )
    )
  );

drop policy if exists "completions_delete" on public.task_completions;

create policy "completions_delete"
  on public.task_completions for delete
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          t.assigned_to = auth.uid()
          or t.assignment_type = 'shared'
          or public.is_admin()
        )
    )
  );

drop policy if exists "completions_update" on public.task_completions;

create policy "completions_update"
  on public.task_completions for update
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          t.assigned_to = auth.uid()
          or t.assignment_type = 'shared'
          or public.is_admin()
        )
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          t.assigned_to = auth.uid()
          or t.assignment_type = 'shared'
          or public.is_admin()
        )
    )
  );

-- ---------------------------------------------------------------
-- نمای امروز: نوع تسک و اینکه چه کسی تیک زده
-- ---------------------------------------------------------------
drop function if exists public.get_tasks_for_date(date, uuid);

create function public.get_tasks_for_date(
  p_date date,
  p_user uuid default null
)
returns table (
  id                uuid,
  title             text,
  description       text,
  priority          text,
  source            text,
  time_of_day       time,
  assigned_to       uuid,
  assignment_type   text,
  category_id       uuid,
  category_name     text,
  category_color    text,
  is_completed      boolean,
  note              text,
  status            text,
  deferred_from     date,
  completed_by_name text
)
language sql
stable
as $$
  select
    t.id, t.title, t.description, t.priority, t.source, t.time_of_day,
    t.assigned_to, t.assignment_type, t.category_id,
    c.name as category_name, c.color as category_color,
    (tc.status = 'done') as is_completed,
    tc.note,
    tc.status,
    t.deferred_from,
    doer.display_name as completed_by_name
  from public.tasks t
  left join public.categories c on c.id = t.category_id
  left join public.task_completions tc
    on tc.task_id = t.id and tc.date = p_date
  left join public.profiles doer on doer.id = tc.completed_by
  where t.is_active
    and public.task_belongs_to_me(
      t.assigned_to, t.assignment_type, t.household_id, p_user
    )
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

-- ---------------------------------------------------------------
-- نمای هفته
-- ---------------------------------------------------------------
drop function if exists public.get_tasks_for_range(date, date, uuid);

create function public.get_tasks_for_range(
  p_from date,
  p_to   date,
  p_user uuid default null
)
returns table (
  day             date,
  id              uuid,
  title           text,
  priority        text,
  source          text,
  time_of_day     time,
  assignment_type text,
  category_name   text,
  category_color  text,
  is_completed    boolean,
  note            text,
  status          text
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
    t.assignment_type,
    c.name as category_name, c.color as category_color,
    (tc.status = 'done') as is_completed,
    tc.note,
    tc.status
  from days d
  join public.tasks t
    on t.is_active
   and public.task_belongs_to_me(
     t.assigned_to, t.assignment_type, t.household_id, p_user
   )
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
-- عقب‌افتاده‌ها
-- ---------------------------------------------------------------
drop function if exists public.get_overdue_tasks(int, uuid);

create function public.get_overdue_tasks(
  p_days int default 14,
  p_user uuid default null
)
returns table (
  day             date,
  id              uuid,
  title           text,
  priority        text,
  source          text,
  schedule_type   text,
  assignment_type text,
  category_name   text,
  category_color  text
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
    t.assignment_type,
    c.name as category_name, c.color as category_color
  from days d
  join public.tasks t
    on t.is_active
   and public.task_belongs_to_me(
     t.assigned_to, t.assignment_type, t.household_id, p_user
   )
   and (t.start_date is null or t.start_date <= d.day)
   and (t.end_date   is null or t.end_date   >= d.day)
   and (
     (t.schedule_type = 'once' and t.due_date = d.day)
     or
     (t.schedule_type = 'weekly'
       and t.priority = 'high'
       and extract(dow from d.day)::smallint = any(t.weekdays))
   )
  left join public.categories c on c.id = t.category_id
  left join public.task_completions tc
    on tc.task_id = t.id and tc.date = d.day
  where tc.id is null
  order by
    d.day desc,
    case t.priority when 'high' then 0 when 'medium' then 1 else 2 end;
$$;

revoke all on function public.get_overdue_tasks(int, uuid) from public, anon;
grant execute on function public.get_overdue_tasks(int, uuid) to authenticated;

-- ---------------------------------------------------------------
-- آمار روزانه — تسک مشترک برای هر دو نفر حساب می‌شود
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
      and public.task_belongs_to_me(
        t.assigned_to, t.assignment_type, t.household_id, p_user
      )
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

-- ---------------------------------------------------------------
-- پیشرفت اعضا در داشبورد ادمین
-- این تابع بر اساس assigned_to گروه می‌کرد؛ تسک مشترک assigned_to
-- ندارد و کلاً از داشبورد ناپدید می‌شد. حالا برای هر عضو خانواده
-- یک نمونه ساخته می‌شود.
-- ---------------------------------------------------------------
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
    select t.id as task_id, m.id as user_id, d.day
    from public.tasks t
    cross join days d
    join public.profiles m
      on (t.assignment_type = 'one'    and m.id = t.assigned_to)
      or (t.assignment_type = 'shared' and m.household_id = t.household_id)
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
    o.user_id,
    count(*) filter (
      where tc.status is distinct from 'skipped'
    )::bigint as total,
    count(*) filter (where tc.status = 'done')::bigint as completed
  from occurrences o
  left join public.task_completions tc
    on tc.task_id = o.task_id and tc.date = o.day
  group by o.user_id;
$$;

revoke all on function public.get_member_progress(date, date) from public, anon;
grant execute on function public.get_member_progress(date, date) to authenticated;
