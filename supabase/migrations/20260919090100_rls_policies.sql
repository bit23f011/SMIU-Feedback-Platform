-- =============================================================================
-- ProfAura — Migration 0002: Row Level Security (Phase 1)
-- -----------------------------------------------------------------------------
-- Principle (spec): "Backend/database must always be the final authority."
-- Isliye HAR table par RLS enable — jab tak explicit policy na ho, sab deny.
--
-- Phase 1 me sirf PUBLIC READ chahiye:
--   * Directory tables (universities..teacher_assignments): sirf is_active rows.
--   * site_notifications: sirf active + current time-window rows.
-- Koi INSERT/UPDATE/DELETE policy NAHI di gayi → client roles (anon/authenticated)
-- kuch bhi likh nahi sakte. Admin writes (Phase 2+) service_role / SECURITY DEFINER
-- functions se honge, jo RLS bypass karte hain. Yehi deny-by-default hai.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Enable RLS on every table (deny-by-default lock)
-- -----------------------------------------------------------------------------
alter table public.universities        enable row level security;
alter table public.departments         enable row level security;
alter table public.programs            enable row level security;
alter table public.courses             enable row level security;
alter table public.semesters           enable row level security;
alter table public.positions           enable row level security;
alter table public.people              enable row level security;
alter table public.person_roles        enable row level security;
alter table public.course_offerings    enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.site_notifications  enable row level security;

-- NOTE: jaan-boojh kar FORCE RLS use NAHI kiya. Plain ENABLE RLS anon/authenticated
-- (client roles) ko poori tarah gate karta hai — wo kabhi table owner nahi hote.
-- Owner/service_role ka bypass intentional hai: migrations aur admin writes (Phase 2+)
-- isi se chalte hain. FORCE lagane se seed/admin inserts tut sakte the.

-- -----------------------------------------------------------------------------
-- Step 2: Table-level SELECT grants (read ke liye zaroori, phir bhi RLS row gate)
-- Sirf SELECT — koi write grant nahi.
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.universities        to anon, authenticated;
grant select on public.departments         to anon, authenticated;
grant select on public.programs            to anon, authenticated;
grant select on public.courses             to anon, authenticated;
grant select on public.semesters           to anon, authenticated;
grant select on public.positions           to anon, authenticated;
grant select on public.people              to anon, authenticated;
grant select on public.person_roles        to anon, authenticated;
grant select on public.course_offerings    to anon, authenticated;
grant select on public.teacher_assignments to anon, authenticated;
grant select on public.site_notifications  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Step 3: Public READ policies (sirf active rows dikhte hain)
-- -----------------------------------------------------------------------------

-- universities
drop policy if exists "public read active universities" on public.universities;
create policy "public read active universities"
  on public.universities for select
  to anon, authenticated
  using (is_active);

-- departments (department active AND uska university bhi active)
drop policy if exists "public read active departments" on public.departments;
create policy "public read active departments"
  on public.departments for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from public.universities u
      where u.id = university_id and u.is_active
    )
  );

-- programs
drop policy if exists "public read active programs" on public.programs;
create policy "public read active programs"
  on public.programs for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from public.departments d
      where d.id = department_id and d.is_active
    )
  );

-- courses
drop policy if exists "public read active courses" on public.courses;
create policy "public read active courses"
  on public.courses for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from public.departments d
      where d.id = department_id and d.is_active
    )
  );

-- semesters (time periods — sab readable)
drop policy if exists "public read semesters" on public.semesters;
create policy "public read semesters"
  on public.semesters for select
  to anon, authenticated
  using (true);

-- positions
drop policy if exists "public read active positions" on public.positions;
create policy "public read active positions"
  on public.positions for select
  to anon, authenticated
  using (is_active);

-- people (sirf active profiles public)
drop policy if exists "public read active people" on public.people;
create policy "public read active people"
  on public.people for select
  to anon, authenticated
  using (is_active);

-- person_roles (role active AND uska person active)
drop policy if exists "public read active person roles" on public.person_roles;
create policy "public read active person roles"
  on public.person_roles for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from public.people p
      where p.id = person_id and p.is_active
    )
  );

-- course_offerings
drop policy if exists "public read active offerings" on public.course_offerings;
create policy "public read active offerings"
  on public.course_offerings for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.is_active
    )
  );

-- teacher_assignments (assignment active AND person active)
drop policy if exists "public read active assignments" on public.teacher_assignments;
create policy "public read active assignments"
  on public.teacher_assignments for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from public.people p
      where p.id = person_id and p.is_active
    )
  );

-- site_notifications — sirf active + current time-window. Ye server-side truth hai;
-- banner ki client query iske upar extra filter lagati hai (defense in depth).
drop policy if exists "public read live notifications" on public.site_notifications;
create policy "public read live notifications"
  on public.site_notifications for select
  to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );
