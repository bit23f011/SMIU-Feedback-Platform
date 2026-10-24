-- Live diagnosis: student_signup aur review_submission dono false return kar rahe hain.
-- Supabase SQL Editor me yeh file run karein. Sirf in dono controls ki pause/schedule hatayegi.
-- Maujooda accounts, reviews aur doosre admin controls mehfooz rehte hain.

begin;

insert into public.feature_flags (key, label, is_enabled, starts_at, ends_at)
values
  ('student_signup', 'Student signup', true, null, null),
  ('review_submission', 'Review submission', true, null, null)
on conflict (key) do update
set is_enabled = true, starts_at = null, ends_at = null, updated_at = now();

do $$
begin
  if not public.feature_enabled('student_signup') or not public.feature_enabled('review_submission') then
    raise exception 'Signup and review submission could not be restored.';
  end if;
end;
$$;

commit;

select key, public.feature_enabled(key) as enabled_now
from public.feature_flags
where key in ('student_signup', 'review_submission')
order by key;
