-- تسک لیستی — تسکی که داخلش آیتم دارد (PLAN-PHASE2 بخش ۲.۴، عمومی‌شده)
--
-- مثال: تسک «نماز» با آیتم‌های صبح، چاشت، عصر، شام، عشا که هر روز
-- تکرار می‌شود و هر روز جداگانه ادا می‌شود.
--
-- همان اصل تسک‌های تکراری: آیتم‌ها الگو هستند و در دیتابیس روزانه
-- تکثیر نمی‌شوند؛ فقط «تیک» روزانه است.
--   task_items            → آیتم‌ها، یک بار
--   task_item_completions → تیک هر آیتم در هر روز
--
-- وقتی همهٔ آیتم‌های یک روز تیک خوردند، خود تسک برای آن روز
-- انجام‌شده ثبت می‌شود (trigger پایین) تا استریک و آمار و
-- عقب‌افتاده‌ها بدون تغییر کار کنند.

alter table public.tasks
  add column if not exists task_type text not null default 'simple'
  check (task_type in ('simple', 'list'));

-- ---------------------------------------------------------------
-- آیتم‌ها
-- ---------------------------------------------------------------
create table if not exists public.task_items (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks on delete cascade,
  title      text not null check (length(trim(title)) > 0),
  quantity   text,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists task_items_task_idx
  on public.task_items (task_id, sort_order);

alter table public.task_items enable row level security;

-- دسترسی آیتم‌ها از روی خود تسک می‌آید: هر کس تسک را می‌بیند،
-- آیتم‌هایش را هم می‌بیند. زیرکوئری خودش تحت RLS جدول tasks است.
create policy "task_items_select"
  on public.task_items for select
  to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

create policy "task_items_insert"
  on public.task_items for insert
  to authenticated
  with check (exists (select 1 from public.tasks t where t.id = task_id));

create policy "task_items_update"
  on public.task_items for update
  to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id))
  with check (exists (select 1 from public.tasks t where t.id = task_id));

create policy "task_items_delete"
  on public.task_items for delete
  to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

-- ---------------------------------------------------------------
-- تیک آیتم‌ها، روز به روز
-- ---------------------------------------------------------------
create table if not exists public.task_item_completions (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.task_items on delete cascade,
  date         date not null,
  completed_by uuid not null references public.profiles on delete cascade,
  completed_at timestamptz not null default now(),

  unique (item_id, date)
);

create index if not exists task_item_completions_date_idx
  on public.task_item_completions (date);

alter table public.task_item_completions enable row level security;

create policy "task_item_completions_select"
  on public.task_item_completions for select
  to authenticated
  using (exists (select 1 from public.task_items i where i.id = item_id));

create policy "task_item_completions_insert"
  on public.task_item_completions for insert
  to authenticated
  with check (
    completed_by = auth.uid()
    -- مثل تسک‌ها: روز آینده هنوز نرسیده
    and date <= (now() at time zone 'Asia/Kabul')::date
    and exists (select 1 from public.task_items i where i.id = item_id)
  );

create policy "task_item_completions_delete"
  on public.task_item_completions for delete
  to authenticated
  using (exists (select 1 from public.task_items i where i.id = item_id));

-- ---------------------------------------------------------------
-- همگام‌سازی: همهٔ آیتم‌های یک روز تیک خورد → خود تسک انجام‌شده
-- ---------------------------------------------------------------
create or replace function public.sync_list_task_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_id uuid;
  v_date    date;
  v_user    uuid;
  v_total   int;
  v_done    int;
begin
  if tg_op = 'DELETE' then
    v_date := old.date;
    v_user := old.completed_by;
    select task_id into v_task_id from public.task_items where id = old.item_id;
  else
    v_date := new.date;
    v_user := new.completed_by;
    select task_id into v_task_id from public.task_items where id = new.item_id;
  end if;

  if v_task_id is null then
    return null;
  end if;

  select count(*) into v_total
    from public.task_items where task_id = v_task_id;

  select count(*) into v_done
    from public.task_item_completions tic
    join public.task_items i on i.id = tic.item_id
   where i.task_id = v_task_id and tic.date = v_date;

  if v_total > 0 and v_done >= v_total then
    insert into public.task_completions (task_id, date, completed_by, status)
    values (v_task_id, v_date, v_user, 'done')
    on conflict (task_id, date) do update set status = 'done';
  else
    -- یکی از آیتم‌ها برداشته شد → تسک دیگر کامل نیست
    delete from public.task_completions
     where task_id = v_task_id and date = v_date and status = 'done';
  end if;

  return null;
end;
$$;

drop trigger if exists sync_list_task_completion on public.task_item_completions;

create trigger sync_list_task_completion
  after insert or delete on public.task_item_completions
  for each row execute function public.sync_list_task_completion();

-- ---------------------------------------------------------------
-- نمای امروز: نوع تسک و پیشرفت آیتم‌های همان روز
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
  task_type         text,
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
    t.assigned_to, t.assignment_type, t.task_type, t.category_id,
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

-- ---------------------------------------------------------------
-- آیتم‌های یک تسک در یک روز، همراه با وضعیت تیک همان روز
-- ---------------------------------------------------------------
create or replace function public.get_task_items(
  p_task_id uuid,
  p_date    date
)
returns table (
  id              uuid,
  title           text,
  quantity        text,
  sort_order      int,
  is_done         boolean,
  done_by_name    text
)
language sql
stable
as $$
  select
    i.id, i.title, i.quantity, i.sort_order,
    (tic.id is not null) as is_done,
    doer.display_name as done_by_name
  from public.task_items i
  left join public.task_item_completions tic
    on tic.item_id = i.id and tic.date = p_date
  left join public.profiles doer on doer.id = tic.completed_by
  where i.task_id = p_task_id
  order by i.sort_order, i.created_at;
$$;

revoke all on function public.get_task_items(uuid, date) from public, anon;
grant execute on function public.get_task_items(uuid, date) to authenticated;

-- ---------------------------------------------------------------
-- ریل‌تایم برای جدول‌های جدید
-- ---------------------------------------------------------------
do $$
declare
  v_table text;
begin
  foreach v_table in array array['task_items', 'task_item_completions']
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
