-- Tikko — RLS و توابع کمکی
-- قواعد طبق PLAN.md بخش ۴

-- ---------------------------------------------------------------
-- توابع کمکی
-- SECURITY DEFINER هستند تا هنگام ارزیابی پالیسی‌ها روی profiles
-- دوباره RLS اجرا نشود (حلقهٔ بی‌نهایت).
-- ---------------------------------------------------------------
create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------
-- فعال‌سازی RLS
-- ---------------------------------------------------------------
alter table public.households       enable row level security;
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_completions enable row level security;

-- ---------------------------------------------------------------
-- profiles
-- نکتهٔ امنیتی: RLS نمی‌تواند ستون‌ها را محدود کند. بدون این revoke،
-- یک member می‌توانست ردیف خودش را update کند و role='admin' بگذارد.
-- تغییر role و household_id فقط از طریق توابع SECURITY DEFINER پایین.
-- ---------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "profiles_select_household"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or household_id = public.current_household_id());

create policy "profiles_update_own_name"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------
-- households
-- ساخت و پیوستن فقط از طریق RPC انجام می‌شود، نه insert مستقیم.
-- ---------------------------------------------------------------
create policy "households_select_own"
  on public.households for select
  to authenticated
  using (id = public.current_household_id());

create policy "households_update_admin"
  on public.households for update
  to authenticated
  using (id = public.current_household_id() and public.is_admin())
  with check (id = public.current_household_id());

-- ---------------------------------------------------------------
-- categories — همه می‌بینند، فقط ادمین مدیریت می‌کند
-- ---------------------------------------------------------------
create policy "categories_select_household"
  on public.categories for select
  to authenticated
  using (household_id = public.current_household_id());

create policy "categories_manage_admin"
  on public.categories for all
  to authenticated
  using (household_id = public.current_household_id() and public.is_admin())
  with check (household_id = public.current_household_id() and public.is_admin());

-- ---------------------------------------------------------------
-- tasks
-- ادمین: همه. عضو: فقط تسک‌های خودش، ساخت/ویرایش/حذف فقط source='self'.
-- ---------------------------------------------------------------
create policy "tasks_select"
  on public.tasks for select
  to authenticated
  using (
    household_id = public.current_household_id()
    and (public.is_admin() or assigned_to = auth.uid())
  );

create policy "tasks_insert"
  on public.tasks for insert
  to authenticated
  with check (
    household_id = public.current_household_id()
    and created_by = auth.uid()
    and (
      public.is_admin()
      or (source = 'self' and assigned_to = auth.uid())
    )
  );

create policy "tasks_update"
  on public.tasks for update
  to authenticated
  using (
    household_id = public.current_household_id()
    and (
      public.is_admin()
      or (source = 'self' and created_by = auth.uid())
    )
  )
  with check (
    household_id = public.current_household_id()
    and (
      public.is_admin()
      or (source = 'self' and created_by = auth.uid() and assigned_to = auth.uid())
    )
  );

create policy "tasks_delete"
  on public.tasks for delete
  to authenticated
  using (
    household_id = public.current_household_id()
    and (
      public.is_admin()
      or (source = 'self' and created_by = auth.uid())
    )
  );

-- ---------------------------------------------------------------
-- task_completions — تیک زدن فقط برای صاحب تسک یا ادمین
-- زیرکوئری روی tasks خودش تحت RLS است، پس دسترسی دوباره محدود می‌شود.
-- ---------------------------------------------------------------
create policy "completions_select"
  on public.task_completions for select
  to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

create policy "completions_insert"
  on public.task_completions for insert
  to authenticated
  with check (
    completed_by = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.assigned_to = auth.uid() or public.is_admin())
    )
  );

create policy "completions_delete"
  on public.task_completions for delete
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.assigned_to = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------
-- RPC: ساخت خانواده (کاربر سازنده = admin)
-- ---------------------------------------------------------------
create or replace function public.create_household(p_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household public.households;
  v_code      text;
begin
  if auth.uid() is null then
    raise exception 'باید وارد شده باشید';
  end if;

  if (select household_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'شما قبلاً عضو یک خانواده هستید';
  end if;

  -- کد دعوت ۶ کاراکتری یکتا
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.households where invite_code = v_code);
  end loop;

  insert into public.households (name, invite_code)
  values (coalesce(nullif(trim(p_name), ''), 'خانواده'), v_code)
  returning * into v_household;

  update public.profiles
    set household_id = v_household.id,
        role         = 'admin'
    where id = auth.uid();

  return v_household;
end;
$$;

-- ---------------------------------------------------------------
-- RPC: پیوستن با کد دعوت (نقش = member)
-- ---------------------------------------------------------------
create or replace function public.join_household(p_invite_code text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household public.households;
begin
  if auth.uid() is null then
    raise exception 'باید وارد شده باشید';
  end if;

  if (select household_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'شما قبلاً عضو یک خانواده هستید';
  end if;

  select * into v_household
    from public.households
    where invite_code = upper(trim(p_invite_code));

  if not found then
    raise exception 'کد دعوت نامعتبر است';
  end if;

  update public.profiles
    set household_id = v_household.id,
        role         = 'member'
    where id = auth.uid();

  return v_household;
end;
$$;

revoke all on function public.create_household(text) from public, anon;
revoke all on function public.join_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
