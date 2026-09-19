-- «امروز می‌کنم» تسک را به امروز می‌آورد، ولی تا حالا هیچ نشانی نمی‌ماند
-- که این کار از کدام روز عقب افتاده بود. با deferred_from در لیست امروز
-- می‌شود برچسب «منتقل‌شده از …» نشان داد.

alter table public.tasks
  add column if not exists deferred_from date;

-- ---------------------------------------------------------------
-- تاریخ اصلی هنگام انتقال ثبت شود
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
    update public.tasks
       set due_date = v_today,
           deferred_from = p_date
     where id = p_task_id;
  else
    -- تکراری جابه‌جا نمی‌شود؛ یک کپی یک‌باره برای امروز
    insert into public.tasks (
      household_id, created_by, assigned_to, title, description,
      category_id, priority, source, schedule_type, due_date, deferred_from
    ) values (
      v_task.household_id, auth.uid(), v_task.assigned_to, v_task.title,
      v_task.description, v_task.category_id, v_task.priority, v_task.source,
      'once', v_today, p_date
    );
  end if;
end;
$$;

revoke all on function public.defer_task_to_today(uuid, date) from public, anon;
grant execute on function public.defer_task_to_today(uuid, date) to authenticated;

-- ---------------------------------------------------------------
-- نمای امروز باید deferred_from را برگرداند
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
  status         text,
  deferred_from  date
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
    tc.status,
    t.deferred_from
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
