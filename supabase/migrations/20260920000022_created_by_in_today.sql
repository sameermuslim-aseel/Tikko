-- نمای امروز باید سازندهٔ تسک را هم برگرداند.
--
-- قاعدهٔ ویرایش: ادمین همه، عضو فقط تسک‌هایی که خودش ساخته.
-- بدون created_by، رابط کاربری نمی‌تواند تسک مشترکی که نفر دیگر
-- ساخته را از تسک خودِ کاربر تشخیص دهد — دکمهٔ ویرایش را نشان
-- می‌داد و بعد دیتابیس رد می‌کرد.

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
  task_type         text,
  created_by        uuid,
  category_id       uuid,
  category_name     text,
  category_color    text,
  is_completed      boolean,
  note              text,
  status            text,
  deferred_from     date,
  completed_by_name text,
  items_total       bigint,
  items_done        bigint
)
language sql
stable
as $$
  select
    t.id, t.title, t.description, t.priority, t.source, t.time_of_day,
    t.assigned_to, t.assignment_type, t.task_type, t.created_by, t.category_id,
    c.name as category_name, c.color as category_color,
    (tc.status = 'done') as is_completed,
    tc.note,
    tc.status,
    t.deferred_from,
    doer.display_name as completed_by_name,
    coalesce(counts.total, 0) as items_total,
    coalesce(counts.done, 0)  as items_done
  from public.tasks t
  left join public.categories c on c.id = t.category_id
  left join public.task_completions tc
    on tc.task_id = t.id and tc.date = p_date
  left join public.profiles doer on doer.id = tc.completed_by
  left join lateral (
    select
      count(*)::bigint as total,
      count(tic.id)::bigint as done
    from public.task_items i
    left join public.task_item_completions tic
      on tic.item_id = i.id and tic.date = p_date
    where i.task_id = t.id
  ) counts on true
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
