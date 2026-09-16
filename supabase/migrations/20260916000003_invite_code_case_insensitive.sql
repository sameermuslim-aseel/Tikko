-- کدهای دعوتی که دستی ساخته شده‌اند ممکن است حروف کوچک باشند،
-- ولی join_household ورودی را upper می‌کرد و مقایسه شکست می‌خورد.
-- راه‌حل: مقایسهٔ بدون حساسیت به بزرگی/کوچکی حروف.

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
    where upper(invite_code) = upper(trim(p_invite_code));

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

revoke all on function public.join_household(text) from public, anon;
grant execute on function public.join_household(text) to authenticated;
