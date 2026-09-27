-- =============================================================================
-- 20260926090000_admin_reference_data.sql
--
-- Phase 5 DB D-1. Admin ka reference-data management (README §49):
-- Departments, Programs, Courses, Semesters, Positions par admin CRUD.
--
-- SAFETY (README §27, §30, §103):
--   * Koi table drop nahi, koi purana data destroy nahi. Yeh migration sirf naye
--     additive functions banati hai (create or replace). Existing rows safe.
--   * HARD DELETE nahi. In tables par bacchon (programs->courses->offerings->
--     assignments, person_roles) ke FK hain. Delete ke bajaye is_active=false
--     (archival). Isse valid FKs kabhi nahi tootte.
--   * Har function ka PEHLA kaam is_admin() check. Frontend button chhupana kaafi
--     nahi; ijazat yahin (server) banti hai.
--   * Har function revoke-before-grant; sirf authenticated ko (andar admin gate).
--     Koi anon nahi. Internal slug helper kisi ko nahi (definer khud call karta).
--   * Har tabdeeli admin_audit_log me jati hai (§103). Reference data me koi raaz
--     nahi, phir bhi hum sirf naam/ids log karte hain.
--   * POSITIONS (README §31): sirf approved designations. Upsert unwanted list ko
--     (case-insensitive) reject karta hai, taake banned title kabhi wapas na aaye.
--
-- SLUG: table ka slug pattern '^[a-z0-9-]+$' hai (hyphen, underscore nahi). Slug
-- create par ek dafa banta hai aur phir LOCK rehta hai (URL stable rahe, criteria
-- ki key jaisa). Update sirf display/FK/is_active badalta hai. Collision par slug
-- khud -2, -3 suffix le leta hai (scope ke andar), is liye create kabhi unique
-- error se fail nahi hota.
-- =============================================================================

begin;

-- =============================================================================
-- 0) Internal slug helper. Yeh EXPOSED nahi. SECURITY DEFINER admin functions
--    ise owner ke taur par call karti hain, is liye grant ki zaroorat nahi.
-- =============================================================================
create or replace function public._admin_slugify(p_text text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select btrim(
    regexp_replace(
      regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'),
      '(^-+|-+$)', '', 'g'
    ),
    '-'
  );
$$;

comment on function public._admin_slugify(text) is
  'Internal. Text ko slug (^[a-z0-9-]+$) me badalta hai. Kisi ko grant nahi.';

-- =============================================================================
-- 1) DEPARTMENTS
-- =============================================================================
create or replace function public.admin_departments_list()
returns table (
  id            uuid,
  name          text,
  short_name    text,
  slug          text,
  is_active     boolean,
  university_id uuid,
  program_count bigint,
  course_count  bigint,
  role_count    bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  return query
    select
      d.id, d.name, d.short_name, d.slug, d.is_active, d.university_id,
      (select count(*) from public.programs p where p.department_id = d.id),
      (select count(*) from public.courses  c where c.department_id = d.id),
      (select count(*) from public.person_roles r where r.department_id = d.id)
    from public.departments d
    order by d.is_active desc, d.name;
end;
$$;

comment on function public.admin_departments_list() is
  'Admin ko saare departments (inactive bhi) + usage counts.';

create or replace function public.admin_upsert_department(
  p_id         uuid,
  p_name       text,
  p_short_name text,
  p_is_active  boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_uni   uuid;
  v_name  text;
  v_short text;
  v_base  text;
  v_slug  text;
  v_n     int := 1;
  v_id    uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_name  := nullif(btrim(coalesce(p_name, '')), '');
  v_short := nullif(btrim(coalesce(p_short_name, '')), '');
  if v_name is null then
    raise exception 'A name is required.' using errcode = 'check_violation';
  end if;

  if p_id is null then
    select u.id into v_uni from public.universities u order by u.created_at limit 1;
    if v_uni is null then
      raise exception 'No university is configured.' using errcode = 'no_data_found';
    end if;

    v_base := public._admin_slugify(v_name);
    if v_base = '' then
      raise exception 'A name is required.' using errcode = 'check_violation';
    end if;
    v_slug := v_base;
    while exists (
      select 1 from public.departments d where d.university_id = v_uni and d.slug = v_slug
    ) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;

    insert into public.departments (university_id, slug, name, short_name, is_active)
    values (v_uni, v_slug, v_name, v_short, coalesce(p_is_active, true))
    returning id into v_id;
  else
    update public.departments
       set name       = v_name,
           short_name = v_short,
           is_active  = coalesce(p_is_active, is_active),
           updated_at = now()
     where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'That item is not available.' using errcode = 'no_data_found';
    end if;
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when p_id is null then 'department.create' else 'department.update' end,
    'department', v_id,
    jsonb_build_object('name', v_name, 'isActive', coalesce(p_is_active, true))
  );

  return v_id;
end;
$$;

comment on function public.admin_upsert_department(uuid, text, text, boolean) is
  'Department banao/update (README §49). Slug create par lock. Hard delete nahi.';

create or replace function public.admin_set_department_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  update public.departments
     set is_active = coalesce(p_active, is_active), updated_at = now()
   where id = p_id
  returning id into v_id;

  if v_id is null then
    raise exception 'That item is not available.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when coalesce(p_active, false) then 'department.activate' else 'department.deactivate' end,
    'department', v_id, jsonb_build_object('isActive', coalesce(p_active, false))
  );
end;
$$;

comment on function public.admin_set_department_active(uuid, boolean) is
  'Department active/inactive (archival). Delete nahi.';

-- =============================================================================
-- 2) PROGRAMS
-- =============================================================================
create or replace function public.admin_programs_list()
returns table (
  id              uuid,
  name            text,
  short_name      text,
  slug            text,
  level           public.program_level,
  is_active       boolean,
  department_id   uuid,
  department_name text,
  course_count    bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  return query
    select
      p.id, p.name, p.short_name, p.slug, p.level, p.is_active,
      p.department_id, d.name,
      (select count(*) from public.courses c where c.program_id = p.id)
    from public.programs p
    left join public.departments d on d.id = p.department_id
    order by p.is_active desc, p.name;
end;
$$;

comment on function public.admin_programs_list() is
  'Admin ko saare programs (inactive bhi) + course_count.';

create or replace function public.admin_upsert_program(
  p_id            uuid,
  p_name          text,
  p_short_name    text,
  p_level         public.program_level,
  p_department_id uuid,
  p_is_active     boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_name  text;
  v_short text;
  v_base  text;
  v_slug  text;
  v_n     int := 1;
  v_id    uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_name  := nullif(btrim(coalesce(p_name, '')), '');
  v_short := nullif(btrim(coalesce(p_short_name, '')), '');
  if v_name is null then
    raise exception 'A name is required.' using errcode = 'check_violation';
  end if;
  if p_department_id is null
     or not exists (select 1 from public.departments d where d.id = p_department_id) then
    raise exception 'Choose a department.' using errcode = 'foreign_key_violation';
  end if;

  if p_id is null then
    v_base := public._admin_slugify(v_name);
    if v_base = '' then
      raise exception 'A name is required.' using errcode = 'check_violation';
    end if;
    v_slug := v_base;
    while exists (
      select 1 from public.programs p where p.department_id = p_department_id and p.slug = v_slug
    ) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;

    insert into public.programs (department_id, slug, name, short_name, level, is_active)
    values (p_department_id, v_slug, v_name, v_short,
            coalesce(p_level, 'undergraduate'), coalesce(p_is_active, true))
    returning id into v_id;
  else
    update public.programs
       set name          = v_name,
           short_name    = v_short,
           level         = coalesce(p_level, level),
           department_id = p_department_id,
           is_active     = coalesce(p_is_active, is_active),
           updated_at    = now()
     where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'That item is not available.' using errcode = 'no_data_found';
    end if;
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when p_id is null then 'program.create' else 'program.update' end,
    'program', v_id,
    jsonb_build_object('name', v_name, 'isActive', coalesce(p_is_active, true))
  );

  return v_id;
end;
$$;

comment on function public.admin_upsert_program(uuid, text, text, public.program_level, uuid, boolean) is
  'Program banao/update (README §49). Slug create par lock. Hard delete nahi.';

create or replace function public.admin_set_program_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  update public.programs
     set is_active = coalesce(p_active, is_active), updated_at = now()
   where id = p_id
  returning id into v_id;

  if v_id is null then
    raise exception 'That item is not available.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when coalesce(p_active, false) then 'program.activate' else 'program.deactivate' end,
    'program', v_id, jsonb_build_object('isActive', coalesce(p_active, false))
  );
end;
$$;

comment on function public.admin_set_program_active(uuid, boolean) is
  'Program active/inactive (archival). Delete nahi.';

-- =============================================================================
-- 3) COURSES
-- =============================================================================
create or replace function public.admin_courses_list()
returns table (
  id              uuid,
  title           text,
  code            text,
  slug            text,
  credit_hours    numeric,
  is_active       boolean,
  department_id   uuid,
  department_name text,
  program_id      uuid,
  program_name    text,
  offering_count  bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  return query
    select
      c.id, c.title, c.code, c.slug, c.credit_hours, c.is_active,
      c.department_id, d.name, c.program_id, pr.name,
      (select count(*) from public.course_offerings o where o.course_id = c.id)
    from public.courses c
    left join public.departments d  on d.id  = c.department_id
    left join public.programs    pr on pr.id = c.program_id
    order by c.is_active desc, c.title;
end;
$$;

comment on function public.admin_courses_list() is
  'Admin ko saare courses (inactive bhi) + offering_count.';

create or replace function public.admin_upsert_course(
  p_id            uuid,
  p_title         text,
  p_code          text,
  p_credit_hours  numeric,
  p_department_id uuid,
  p_program_id    uuid,
  p_is_active     boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_title  text;
  v_code   text;
  v_credit numeric;
  v_base   text;
  v_slug   text;
  v_n      int := 1;
  v_id     uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_title := nullif(btrim(coalesce(p_title, '')), '');
  v_code  := nullif(btrim(coalesce(p_code, '')), '');
  if v_title is null then
    raise exception 'A title is required.' using errcode = 'check_violation';
  end if;
  if p_department_id is null
     or not exists (select 1 from public.departments d where d.id = p_department_id) then
    raise exception 'Choose a department.' using errcode = 'foreign_key_violation';
  end if;
  -- Program optional. Agar diya hai to wo isi department ka hona chahiye.
  if p_program_id is not null
     and not exists (
       select 1 from public.programs p
        where p.id = p_program_id and p.department_id = p_department_id
     ) then
    raise exception 'Choose a program.' using errcode = 'foreign_key_violation';
  end if;

  v_credit := case
    when p_credit_hours is null then null
    when p_credit_hours < 0 or p_credit_hours > 99 then null
    else p_credit_hours
  end;

  if p_id is null then
    v_base := public._admin_slugify(coalesce(v_code, '') || ' ' || v_title);
    if v_base = '' then
      raise exception 'A title is required.' using errcode = 'check_violation';
    end if;
    v_slug := v_base;
    while exists (
      select 1 from public.courses c where c.department_id = p_department_id and c.slug = v_slug
    ) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;

    insert into public.courses (department_id, program_id, code, title, slug, credit_hours, is_active)
    values (p_department_id, p_program_id, v_code, v_title, v_slug, v_credit,
            coalesce(p_is_active, true))
    returning id into v_id;
  else
    update public.courses
       set title         = v_title,
           code          = v_code,
           credit_hours  = v_credit,
           department_id = p_department_id,
           program_id    = p_program_id,
           is_active     = coalesce(p_is_active, is_active),
           updated_at    = now()
     where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'That item is not available.' using errcode = 'no_data_found';
    end if;
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when p_id is null then 'course.create' else 'course.update' end,
    'course', v_id,
    jsonb_build_object('title', v_title, 'isActive', coalesce(p_is_active, true))
  );

  return v_id;
end;
$$;

comment on function public.admin_upsert_course(uuid, text, text, numeric, uuid, uuid, boolean) is
  'Course banao/update (README §49). Slug create par lock. Hard delete nahi.';

create or replace function public.admin_set_course_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  update public.courses
     set is_active = coalesce(p_active, is_active), updated_at = now()
   where id = p_id
  returning id into v_id;

  if v_id is null then
    raise exception 'That item is not available.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when coalesce(p_active, false) then 'course.activate' else 'course.deactivate' end,
    'course', v_id, jsonb_build_object('isActive', coalesce(p_active, false))
  );
end;
$$;

comment on function public.admin_set_course_active(uuid, boolean) is
  'Course active/inactive (archival). Delete nahi.';

-- =============================================================================
-- 4) SEMESTERS. is_active nahi hota; is_current hota hai (sirf ek, partial unique
--    index se). Delete nahi (offerings/reviews ka FK). Sirf list + upsert.
-- =============================================================================
create or replace function public.admin_semesters_list()
returns table (
  id             uuid,
  label          text,
  season         public.semester_season,
  year           int,
  slug           text,
  is_current     boolean,
  starts_on      date,
  ends_on        date,
  offering_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  return query
    select
      s.id, s.label, s.season, s.year, s.slug, s.is_current, s.starts_on, s.ends_on,
      (select count(*) from public.course_offerings o where o.semester_id = s.id)
    from public.semesters s
    order by s.year desc, s.season;
end;
$$;

comment on function public.admin_semesters_list() is
  'Admin ko saare semesters + offering_count.';

create or replace function public.admin_upsert_semester(
  p_id         uuid,
  p_label      text,
  p_season     public.semester_season,
  p_year       int,
  p_is_current boolean,
  p_starts_on  date,
  p_ends_on    date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_label   text;
  v_current boolean := coalesce(p_is_current, false);
  v_base    text;
  v_slug    text;
  v_n       int := 1;
  v_id      uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_label := nullif(btrim(coalesce(p_label, '')), '');
  if v_label is null then
    raise exception 'A name is required.' using errcode = 'check_violation';
  end if;
  if p_season is null then
    raise exception 'Choose a season.' using errcode = 'check_violation';
  end if;
  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'Enter a valid year.' using errcode = 'check_violation';
  end if;
  if p_starts_on is not null and p_ends_on is not null and p_ends_on < p_starts_on then
    raise exception 'The end date cannot be before the start date.' using errcode = 'check_violation';
  end if;

  -- (season, year) unique. Duplicate ko saaf message do.
  if exists (
    select 1 from public.semesters s
     where s.season = p_season and s.year = p_year
       and (p_id is null or s.id <> p_id)
  ) then
    raise exception 'That semester already exists.' using errcode = 'unique_violation';
  end if;

  -- Sirf ek current ho sakta hai. Agar yeh current ban raha hai to baaki clear.
  if v_current then
    update public.semesters set is_current = false, updated_at = now()
     where is_current and (p_id is null or id <> p_id);
  end if;

  if p_id is null then
    v_base := public._admin_slugify(v_label);
    if v_base = '' then
      raise exception 'A name is required.' using errcode = 'check_violation';
    end if;
    v_slug := v_base;
    while exists (select 1 from public.semesters s where s.slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;

    insert into public.semesters (slug, season, year, label, starts_on, ends_on, is_current)
    values (v_slug, p_season, p_year, v_label, p_starts_on, p_ends_on, v_current)
    returning id into v_id;
  else
    update public.semesters
       set label      = v_label,
           season     = p_season,
           year       = p_year,
           starts_on  = p_starts_on,
           ends_on    = p_ends_on,
           is_current = v_current,
           updated_at = now()
     where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'That item is not available.' using errcode = 'no_data_found';
    end if;
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when p_id is null then 'semester.create' else 'semester.update' end,
    'semester', v_id,
    jsonb_build_object('label', v_label, 'isCurrent', v_current)
  );

  return v_id;
end;
$$;

comment on function public.admin_upsert_semester(uuid, text, public.semester_season, int, boolean, date, date) is
  'Semester banao/update (README §49). Ek hi current (baaki auto clear). Delete nahi.';

-- =============================================================================
-- 5) POSITIONS (README §31). Approved designations hi. Upsert unwanted list ko
--    reject karta hai (case-insensitive), taake banned title kabhi wapas na aaye.
-- =============================================================================
create or replace function public.admin_positions_list()
returns table (
  id         uuid,
  title      text,
  slug       text,
  rank       int,
  category   public.person_category,
  is_active  boolean,
  role_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  return query
    select
      p.id, p.title, p.slug, p.rank, p.category, p.is_active,
      (select count(*) from public.person_roles r where r.position_id = p.id)
    from public.positions p
    order by p.is_active desc, p.rank, p.title;
end;
$$;

comment on function public.admin_positions_list() is
  'Admin ko saare positions (inactive bhi) + role_count.';

create or replace function public.admin_upsert_position(
  p_id        uuid,
  p_title     text,
  p_rank      int,
  p_category  public.person_category,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_title text;
  v_base  text;
  v_slug  text;
  v_n     int := 1;
  v_id    uuid;
  -- README §31: yeh titles kabhi allow nahi. Lowercase, trimmed comparison.
  v_banned constant text[] := array[
    'it support officer','lab engineer','hr manager','account officer',
    'senior lecturer','chairperson','deputy registrar','hr assistant',
    'librarian','teaching assistant','examination officer','lecturer',
    'registrar','hr officer','assistant professor'
  ];
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_title := nullif(btrim(coalesce(p_title, '')), '');
  if v_title is null then
    raise exception 'A title is required.' using errcode = 'check_violation';
  end if;
  if lower(v_title) = any (v_banned) then
    raise exception 'This position title is not allowed.' using errcode = 'check_violation';
  end if;

  if p_id is null then
    v_base := public._admin_slugify(v_title);
    if v_base = '' then
      raise exception 'A title is required.' using errcode = 'check_violation';
    end if;
    v_slug := v_base;
    while exists (select 1 from public.positions p where p.slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;

    insert into public.positions (slug, title, category, rank, is_active)
    values (v_slug, v_title, p_category, coalesce(p_rank, 0), coalesce(p_is_active, true))
    returning id into v_id;
  else
    update public.positions
       set title      = v_title,
           category   = p_category,
           rank       = coalesce(p_rank, rank),
           is_active  = coalesce(p_is_active, is_active),
           updated_at = now()
     where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'That item is not available.' using errcode = 'no_data_found';
    end if;
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when p_id is null then 'position.create' else 'position.update' end,
    'position', v_id,
    jsonb_build_object('title', v_title, 'isActive', coalesce(p_is_active, true))
  );

  return v_id;
end;
$$;

comment on function public.admin_upsert_position(uuid, text, int, public.person_category, boolean) is
  'Position banao/update (README §31). Unwanted titles reject. Slug create par lock.';

create or replace function public.admin_set_position_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  update public.positions
     set is_active = coalesce(p_active, is_active), updated_at = now()
   where id = p_id
  returning id into v_id;

  if v_id is null then
    raise exception 'That item is not available.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when coalesce(p_active, false) then 'position.activate' else 'position.deactivate' end,
    'position', v_id, jsonb_build_object('isActive', coalesce(p_active, false))
  );
end;
$$;

comment on function public.admin_set_position_active(uuid, boolean) is
  'Position active/inactive (archival). Delete nahi.';

-- =============================================================================
-- 6) GRANTS. STANDING RULE: pehle sab se chheeno, phir sirf authenticated ko do
--    (andar is_admin() gate). Koi anon nahi. Internal helper kisi ko nahi.
-- =============================================================================
revoke all on function public._admin_slugify(text)                                                              from public, anon, authenticated;

revoke all on function public.admin_departments_list()                                                          from public, anon, authenticated;
revoke all on function public.admin_upsert_department(uuid, text, text, boolean)                                 from public, anon, authenticated;
revoke all on function public.admin_set_department_active(uuid, boolean)                                         from public, anon, authenticated;
revoke all on function public.admin_programs_list()                                                             from public, anon, authenticated;
revoke all on function public.admin_upsert_program(uuid, text, text, public.program_level, uuid, boolean)        from public, anon, authenticated;
revoke all on function public.admin_set_program_active(uuid, boolean)                                            from public, anon, authenticated;
revoke all on function public.admin_courses_list()                                                              from public, anon, authenticated;
revoke all on function public.admin_upsert_course(uuid, text, text, numeric, uuid, uuid, boolean)                from public, anon, authenticated;
revoke all on function public.admin_set_course_active(uuid, boolean)                                             from public, anon, authenticated;
revoke all on function public.admin_semesters_list()                                                            from public, anon, authenticated;
revoke all on function public.admin_upsert_semester(uuid, text, public.semester_season, int, boolean, date, date) from public, anon, authenticated;
revoke all on function public.admin_positions_list()                                                            from public, anon, authenticated;
revoke all on function public.admin_upsert_position(uuid, text, int, public.person_category, boolean)            from public, anon, authenticated;
revoke all on function public.admin_set_position_active(uuid, boolean)                                           from public, anon, authenticated;

grant execute on function public.admin_departments_list()                                                       to authenticated;
grant execute on function public.admin_upsert_department(uuid, text, text, boolean)                              to authenticated;
grant execute on function public.admin_set_department_active(uuid, boolean)                                      to authenticated;
grant execute on function public.admin_programs_list()                                                          to authenticated;
grant execute on function public.admin_upsert_program(uuid, text, text, public.program_level, uuid, boolean)     to authenticated;
grant execute on function public.admin_set_program_active(uuid, boolean)                                         to authenticated;
grant execute on function public.admin_courses_list()                                                           to authenticated;
grant execute on function public.admin_upsert_course(uuid, text, text, numeric, uuid, uuid, boolean)             to authenticated;
grant execute on function public.admin_set_course_active(uuid, boolean)                                          to authenticated;
grant execute on function public.admin_semesters_list()                                                         to authenticated;
grant execute on function public.admin_upsert_semester(uuid, text, public.semester_season, int, boolean, date, date) to authenticated;
grant execute on function public.admin_positions_list()                                                         to authenticated;
grant execute on function public.admin_upsert_position(uuid, text, int, public.person_category, boolean)         to authenticated;
grant execute on function public.admin_set_position_active(uuid, boolean)                                        to authenticated;

commit;
