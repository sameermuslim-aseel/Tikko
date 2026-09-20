-- ویرایش تسک
--
-- قانون قبلی update برای عضو شرط «assigned_to = auth.uid()» داشت، ولی
-- تسک مشترک اصلاً assigned_to ندارد (null است). یعنی عضو نمی‌توانست
-- تسک مشترکِ ساختهٔ خودش را ویرایش کند — همان اشتباهی که موقع افزودن
-- تسک مشترک در insert درست شد ولی در update جا ماند.

drop policy if exists "tasks_update" on public.tasks;

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
      or (
        source = 'self'
        and created_by = auth.uid()
        and (
          assigned_to = auth.uid()
          or (assignment_type = 'shared' and assigned_to is null)
        )
      )
    )
  );
