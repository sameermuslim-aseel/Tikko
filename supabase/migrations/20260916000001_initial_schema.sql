-- Tikko — اسکیمای اولیه
-- جدول‌ها طبق PLAN.md بخش ۴

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- households (خانواده)
-- ---------------------------------------------------------------
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- کد دعوت برای پیوستن اعضای جدید (PLAN بخش ۵)
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- profiles (پروفایل کاربر، مرتبط با auth.users)
-- ---------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  household_id uuid references public.households on delete set null,
  display_name text,
  role         text not null default 'member' check (role in ('admin', 'member')),
  created_at   timestamptz not null default now()
);

create index profiles_household_id_idx on public.profiles (household_id);

-- ---------------------------------------------------------------
-- categories (کتگوری‌ها)
-- ---------------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name         text not null,
  color        text,           -- hex
  icon         text,           -- اسم آیکون lucide
  created_at   timestamptz not null default now()
);

create index categories_household_id_idx on public.categories (household_id);

-- ---------------------------------------------------------------
-- tasks (تعریف تسک / الگو)
-- ---------------------------------------------------------------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households on delete cascade,
  created_by    uuid not null references public.profiles on delete cascade,
  assigned_to   uuid not null references public.profiles on delete cascade,
  title         text not null check (length(trim(title)) > 0),
  description   text,
  category_id   uuid references public.categories on delete set null,
  priority      text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  -- کلید مجوز حذف: عضو فقط تسک‌های 'self' خودش را می‌تواند حذف کند
  source        text not null check (source in ('admin', 'self')),
  -- زمان‌بندی
  schedule_type text not null check (schedule_type in ('once', 'weekly')),
  due_date      date,            -- فقط برای once
  weekdays      smallint[],      -- فقط برای weekly: 0=یکشنبه … 6=شنبه
  start_date    date,
  end_date      date,
  time_of_day   time,            -- اختیاری، فقط نمایشی
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),

  -- هر نوع زمان‌بندی فیلدهای خودش را لازم دارد
  constraint tasks_schedule_fields_check check (
    (schedule_type = 'once'   and due_date is not null and weekdays is null)
    or
    (schedule_type = 'weekly' and weekdays is not null and array_length(weekdays, 1) > 0)
  ),
  -- عملگر <@ زیرمجموعه‌بودن را چک می‌کند (subquery در CHECK مجاز نیست)
  constraint tasks_weekdays_range_check check (
    weekdays is null or weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  constraint tasks_date_order_check check (
    end_date is null or start_date is null or end_date >= start_date
  )
);

create index tasks_assigned_to_idx  on public.tasks (assigned_to) where is_active;
create index tasks_household_id_idx on public.tasks (household_id);

-- ---------------------------------------------------------------
-- task_completions (وضعیت انجام برای هر روز)
-- ---------------------------------------------------------------
create table public.task_completions (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks on delete cascade,
  date         date not null,
  completed_by uuid not null references public.profiles on delete cascade,
  completed_at timestamptz not null default now(),
  -- یک تیک برای هر تسک در هر روز
  unique (task_id, date)
);

create index task_completions_date_idx on public.task_completions (date);

-- ---------------------------------------------------------------
-- تریگر: بعد از ثبت‌نام، پروفایل ساخته شود
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
