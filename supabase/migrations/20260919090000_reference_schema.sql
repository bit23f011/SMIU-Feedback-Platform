-- =============================================================================
-- ProfAura — Migration 0001: Reference schema (Phase 1)
-- -----------------------------------------------------------------------------
-- Ye migration platform ka "directory" backbone banata hai: universities,
-- departments, programs, courses, semesters, positions, aur people (jinke reviews
-- honge). Reviews/students/auth tables Phase 2+ me aayenge.
--
-- Design rule (spec): "ONE PERSON = ONE PUBLIC PROFILE". Isliye `people` canonical
-- person hai, aur `person_roles` ek hi person ko multiple roles/categories deta hai
-- (kabhi duplicate person nahi banate).
--
-- Security note: RLS is file me enable NAHI hoti — wo alag migration (0002) me hai
-- taake schema aur policy alag-alag padhne me clear rahe. Tab tak tables locked hain.
-- =============================================================================

-- gen_random_uuid() ke liye. PG13+ me core me hai, magar safe-side pgcrypto bhi.
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

-- Paanch review categories. Yehi 5 buckets pure platform me use hote hain.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'person_category') then
    create type public.person_category as enum (
      'teacher',
      'lab_instructor',
      'faculty',
      'university_staff',
      'hr_staff'
    );
  end if;
end
$$;

-- Notification banner ki priority (color + icon isi se decide hota hai UI me).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_priority') then
    create type public.notification_priority as enum (
      'info',
      'success',
      'warning',
      'critical'
    );
  end if;
end
$$;

-- Program ka level.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'program_level') then
    create type public.program_level as enum (
      'undergraduate',
      'graduate',
      'postgraduate',
      'diploma'
    );
  end if;
end
$$;

-- Semester ka season.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'semester_season') then
    create type public.semester_season as enum (
      'spring',
      'summer',
      'fall',
      'winter'
    );
  end if;
end
$$;

-- Person ka gender. Sirf default avatar choose karne ke liye rakha hai
-- (MVP me koi photo upload nahi). Column nullable hai — null = unknown, us waqt
-- neutral avatar dikhta hai. Yeh public reference data hai, student PII nahi.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'person_gender') then
    create type public.person_gender as enum (
      'male',
      'female'
    );
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Shared trigger function: updated_at ko auto set karo
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Security hygiene: is function ko koi client role direct call na kar sake.
-- Trigger firing par execute-grant check nahi hota, magar defense-in-depth ke liye.
revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
revoke all on function public.set_updated_at() from authenticated;

-- -----------------------------------------------------------------------------
-- universities
-- -----------------------------------------------------------------------------
create table if not exists public.universities (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  short_name  text not null,
  full_name   text not null,
  city        text,
  country     text,
  website     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.universities is
  'Top-level institutions. Architecture multi-university hai; pehli SMIU.';

-- -----------------------------------------------------------------------------
-- departments
-- -----------------------------------------------------------------------------
create table if not exists public.departments (
  id             uuid primary key default gen_random_uuid(),
  university_id  uuid not null references public.universities(id) on delete cascade,
  slug           text not null check (slug ~ '^[a-z0-9-]+$'),
  name           text not null,
  short_name     text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (university_id, slug)
);

-- -----------------------------------------------------------------------------
-- programs (degree programs, e.g. BSIT)
-- -----------------------------------------------------------------------------
create table if not exists public.programs (
  id             uuid primary key default gen_random_uuid(),
  department_id  uuid not null references public.departments(id) on delete cascade,
  slug           text not null check (slug ~ '^[a-z0-9-]+$'),
  name           text not null,
  short_name     text,
  level          public.program_level not null default 'undergraduate',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (department_id, slug)
);

-- -----------------------------------------------------------------------------
-- courses
-- -----------------------------------------------------------------------------
create table if not exists public.courses (
  id             uuid primary key default gen_random_uuid(),
  department_id  uuid not null references public.departments(id) on delete cascade,
  program_id     uuid references public.programs(id) on delete set null,
  code           text,
  title          text not null,
  slug           text not null check (slug ~ '^[a-z0-9-]+$'),
  credit_hours   numeric(3,1),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (department_id, slug)
);

-- -----------------------------------------------------------------------------
-- semesters (global time periods)
-- -----------------------------------------------------------------------------
create table if not exists public.semesters (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  season      public.semester_season not null,
  year        int not null check (year between 2000 and 2100),
  label       text not null,
  starts_on   date,
  ends_on     date,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (season, year)
);

-- Sirf ek semester "current" ho sakta hai (server-enforced).
create unique index if not exists semesters_one_current_idx
  on public.semesters (is_current)
  where is_current;

-- -----------------------------------------------------------------------------
-- positions (designations, e.g. HOD, Dean) — approved list hi seed hoti hai.
-- category NULL ka matlab: yeh designation kisi bhi category me use ho sakti hai
-- (misal Coordinator teacher bhi ho sakta hai aur staff bhi). Agar kisi designation
-- ko ek hi category tak mehdood karna ho to wahan category set kar do.
-- -----------------------------------------------------------------------------
create table if not exists public.positions (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title       text not null,
  category    public.person_category,
  rank        int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- people — CANONICAL person. Ek insaan = ek row = ek public profile.
-- -----------------------------------------------------------------------------
create table if not exists public.people (
  id                uuid primary key default gen_random_uuid(),
  university_id     uuid not null references public.universities(id) on delete cascade,
  slug              text not null check (slug ~ '^[a-z0-9-]+$'),
  full_name         text not null,
  display_name      text,
  title_prefix      text,
  headline          text,
  bio               text,
  photo_url         text,
  gender            public.person_gender,
  primary_category  public.person_category,
  is_active         boolean not null default true,
  is_verified       boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (university_id, slug)
);

comment on table public.people is
  'Canonical person (teacher/staff). ONE PERSON = ONE PROFILE. Multiple roles person_roles me.';

-- -----------------------------------------------------------------------------
-- person_roles — ek person ke multiple roles (category + optional position/dept)
-- -----------------------------------------------------------------------------
create table if not exists public.person_roles (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.people(id) on delete cascade,
  category       public.person_category not null,
  position_id    uuid references public.positions(id) on delete set null,
  department_id  uuid references public.departments(id) on delete set null,
  title_override text,
  is_primary     boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Same person + same (category, dept, position) do baar na aaye. NULLS NOT DISTINCT
-- (PG15) taake null dept/position bhi duplicate na banein.
create unique index if not exists person_roles_unique_idx
  on public.person_roles (person_id, category, department_id, position_id)
  nulls not distinct;

-- Har person ka max ek "primary" role (default display ke liye).
create unique index if not exists person_roles_one_primary_idx
  on public.person_roles (person_id)
  where is_primary;

-- -----------------------------------------------------------------------------
-- course_offerings — ek course kisi semester me offer hua
-- -----------------------------------------------------------------------------
create table if not exists public.course_offerings (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  semester_id  uuid not null references public.semesters(id) on delete cascade,
  program_id   uuid references public.programs(id) on delete set null,
  section      text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists course_offerings_unique_idx
  on public.course_offerings (course_id, semester_id, section)
  nulls not distinct;

-- -----------------------------------------------------------------------------
-- teacher_assignments — kis person ne kaunsa offering parhaya
-- -----------------------------------------------------------------------------
create table if not exists public.teacher_assignments (
  id                  uuid primary key default gen_random_uuid(),
  person_id           uuid not null references public.people(id) on delete cascade,
  course_offering_id  uuid not null references public.course_offerings(id) on delete cascade,
  category            public.person_category not null default 'teacher',
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (person_id, course_offering_id)
);

-- -----------------------------------------------------------------------------
-- site_notifications — admin-driven banner (homepage). Notification banner query
-- isi table/columns par depend karti hai.
-- -----------------------------------------------------------------------------
create table if not exists public.site_notifications (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  message     text not null check (length(btrim(message)) > 0),
  priority    public.notification_priority not null default 'info',
  href        text,
  cta_label   text,
  is_active   boolean not null default false,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Agar dono time diye hain to end start ke baad hona chahiye.
  check (starts_at is null or ends_at is null or ends_at >= starts_at)
);

comment on table public.site_notifications is
  'Admin banner. Public sirf active + current-window rows dekhta hai (RLS 0002).';

-- -----------------------------------------------------------------------------
-- Foreign-key / lookup indexes (Postgres FK par auto-index nahi banata)
-- -----------------------------------------------------------------------------
create index if not exists departments_university_id_idx      on public.departments (university_id);
create index if not exists programs_department_id_idx         on public.programs (department_id);
create index if not exists courses_department_id_idx          on public.courses (department_id);
create index if not exists courses_program_id_idx             on public.courses (program_id);
create index if not exists people_university_id_idx           on public.people (university_id);
create index if not exists people_primary_category_idx        on public.people (primary_category);
create index if not exists person_roles_person_id_idx         on public.person_roles (person_id);
create index if not exists person_roles_position_id_idx       on public.person_roles (position_id);
create index if not exists person_roles_department_id_idx     on public.person_roles (department_id);
create index if not exists person_roles_category_idx          on public.person_roles (category);
create index if not exists course_offerings_course_id_idx     on public.course_offerings (course_id);
create index if not exists course_offerings_semester_id_idx   on public.course_offerings (semester_id);
create index if not exists course_offerings_program_id_idx    on public.course_offerings (program_id);
create index if not exists teacher_assignments_person_id_idx  on public.teacher_assignments (person_id);
create index if not exists teacher_assignments_offering_id_idx on public.teacher_assignments (course_offering_id);
create index if not exists positions_category_idx             on public.positions (category);

-- Banner query ke liye (is_active + newest first).
create index if not exists site_notifications_active_idx
  on public.site_notifications (is_active, created_at desc);

-- -----------------------------------------------------------------------------
-- updated_at triggers (har table jiska updated_at hai)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'universities','departments','programs','courses','semesters','positions',
    'people','person_roles','course_offerings','teacher_assignments','site_notifications'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end
$$;
