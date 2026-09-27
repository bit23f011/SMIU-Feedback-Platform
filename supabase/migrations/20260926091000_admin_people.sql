-- =============================================================================
-- 20260926091000_admin_people.sql
--
-- Phase 5 DB D-2. People content-management (README §28-§30, §49) + do read-only
-- viewers (Students, Audit Logs).
--
-- SAFETY (README §27, §30, §103):
--   * Koi table drop nahi, koi purana data destroy nahi. Sab additive functions.
--   * Har function ka pehla kaam is_admin(). Frontend authority nahi.
--   * Har function revoke-before-grant; sirf authenticated (andar admin gate).
--   * Har mutation admin_audit_log me. Secrets kabhi log nahi.
--   * PERSON DEACTIVATION yahan NAHI. Wo pehle se set_person_active(uuid,bool,text)
--     hai (reason zaroori, §51). Review reset/merge bhi pehle se
--     (admin_reset_person_reviews / admin_merge_people). Yahan sirf create/update
--     + roles + assignments + viewers.
--
-- ONE PERSON = ONE PROFILE (README §27): create par slug full_name se banta hai
-- aur university ke andar unique hota hai. Duplicate se bachne ke liye UI pehle
-- search karti hai; do asli hum-naam log allow hain, ghalti se bana duplicate
-- admin_merge_people se milaya jata hai.
--
-- ADD PERSON RULES (README §28-§30):
--   * Teacher: teacher_type (internal/external/corporate) zaroori.
--   * Internal teacher: department zaroori + Faculty role KHUD-BAKHUD ban jata hai
--     (auto-associate). Position optional (UI dikhati hai).
--   * Lab Instructor: teacher_type FORCE nahi hota (null).
--   * Baaki categories: teacher_type null.
--
-- STUDENTS viewer: sirf account fields (email admin-only). REVIEWS se kabhi join
-- nahi (structural anonymity mehfooz rahe).
-- =============================================================================

begin;

-- =============================================================================
-- 1) PEOPLE - list (category/search/status filter + pagination + total_count)
-- =============================================================================
create or replace function public.admin_people_list(
  p_category public.person_category,
  p_search   text,
  p_status   text,
  p_limit    int,
  p_offset   int
)
returns table (
  id               uuid,
  full_name        text,
  display_name     text,
  slug             text,
  primary_category public.person_category,
  teacher_type     public.teacher_type,
  gender           public.person_gender,
  headline         text,
  is_active        boolean,
  is_verified      boolean,
  role_count       bigint,
  review_count     bigint,
  total_count      bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_status text := lower(coalesce(nullif(btrim(p_status), ''), 'all'));
  v_limit  int  := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset int  := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;
  if v_status not in ('all', 'active', 'inactive', 'unverified') then
    v_status := 'all';
  end if;

  return query
    select
      p.id, p.full_name, p.display_name, p.slug, p.primary_category, p.teacher_type,
      p.gender, p.headline, p.is_active, p.is_verified,
      (select count(*) from public.person_roles r where r.person_id = p.id and r.is_active),
      (select count(*) from public.reviews rv where rv.person_id = p.id and rv.status = 'published'),
      count(*) over()
    from public.people p
    where (
        p_category is null
        or p.primary_category = p_category
        or exists (
          select 1 from public.person_roles r
           where r.person_id = p.id and r.category = p_category
        )
      )
      and (
        v_search is null
        or p.full_name ilike '%' || v_search || '%'
        or coalesce(p.display_name, '') ilike '%' || v_search || '%'
      )
      and (
        v_status = 'all'
        or (v_status = 'active'     and p.is_active)
        or (v_status = 'inactive'   and not p.is_active)
        or (v_status = 'unverified' and not p.is_verified)
      )
    order by p.is_active desc, p.full_name
    limit v_limit offset v_offset;
end;
$$;

comment on function public.admin_people_list(public.person_category, text, text, int, int) is
  'Admin people list (category/search/status filter, paginated, total_count).';

-- =============================================================================
-- 2) PEOPLE - single person detail (core fields)
-- =============================================================================
create or replace function public.admin_get_person(p_person_id uuid)
returns table (
  id               uuid,
  full_name        text,
  display_name     text,
  title_prefix     text,
  headline         text,
  bio              text,
  slug             text,
  gender           public.person_gender,
  primary_category public.person_category,
  teacher_type     public.teacher_type,
  is_active        boolean,
  is_verified      boolean
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
      p.id, p.full_name, p.display_name, p.title_prefix, p.headline, p.bio, p.slug,
      p.gender, p.primary_category, p.teacher_type, p.is_active, p.is_verified
    from public.people p
    where p.id = p_person_id;
end;
$$;

comment on function public.admin_get_person(uuid) is 'Admin ko ek person ka core detail.';

-- 2b) person ke roles (position/department naam ke saath)
create or replace function public.admin_person_roles(p_person_id uuid)
returns table (
  id              uuid,
  category        public.person_category,
  department_id   uuid,
  department_name text,
  position_id     uuid,
  position_title  text,
  title_override  text,
  is_primary      boolean,
  is_active       boolean
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
      r.id, r.category, r.department_id, d.name, r.position_id, pos.title,
      r.title_override, r.is_primary, r.is_active
    from public.person_roles r
    left join public.departments d   on d.id   = r.department_id
    left join public.positions   pos on pos.id = r.position_id
    where r.person_id = p_person_id
    order by r.is_primary desc, r.is_active desc, r.category;
end;
$$;

comment on function public.admin_person_roles(uuid) is 'Admin ko ek person ke saare roles.';

-- 2c) person ke teaching assignments (course + semester naam ke saath)
create or replace function public.admin_person_assignments(p_person_id uuid)
returns table (
  id                 uuid,
  course_offering_id uuid,
  course_id          uuid,
  course_title       text,
  semester_id        uuid,
  semester_label     text,
  section            text,
  category           public.person_category,
  is_active          boolean
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
      a.id, a.course_offering_id, o.course_id, c.title, o.semester_id, s.label,
      o.section, a.category, a.is_active
    from public.teacher_assignments a
    join public.course_offerings o on o.id = a.course_offering_id
    join public.courses          c on c.id = o.course_id
    join public.semesters        s on s.id = o.semester_id
    where a.person_id = p_person_id
    order by s.year desc, s.season, c.title;
end;
$$;

comment on function public.admin_person_assignments(uuid) is 'Admin ko ek person ki teaching assignments.';

-- =============================================================================
-- 3) PEOPLE - create (README §28-§30). Person + primary role ek transaction me.
--    Internal teacher -> Faculty role auto + department zaroori.
-- =============================================================================
create or replace function public.admin_create_person(
  p_full_name     text,
  p_category      public.person_category,
  p_gender        public.person_gender,
  p_teacher_type  public.teacher_type,
  p_department_id uuid,
  p_position_id   uuid,
  p_display_name  text,
  p_headline      text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_uni  uuid;
  v_name text;
  v_disp text;
  v_head text;
  v_tt   public.teacher_type;
  v_base text;
  v_slug text;
  v_n    int := 1;
  v_id   uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_name := nullif(btrim(coalesce(p_full_name, '')), '');
  v_disp := nullif(btrim(coalesce(p_display_name, '')), '');
  v_head := nullif(btrim(coalesce(p_headline, '')), '');
  if v_name is null then
    raise exception 'A name is required.' using errcode = 'check_violation';
  end if;
  if p_category is null then
    raise exception 'Choose a category.' using errcode = 'check_violation';
  end if;

  -- teacher_type sirf Teacher ke liye. Lab instructor par kabhi force nahi.
  if p_category = 'teacher' then
    if p_teacher_type is null then
      raise exception 'Choose a teacher type.' using errcode = 'check_violation';
    end if;
    v_tt := p_teacher_type;
  else
    v_tt := null;
  end if;

  -- Internal teacher -> department zaroori (Faculty se judne ke liye).
  if p_category = 'teacher' and v_tt = 'internal' and p_department_id is null then
    raise exception 'Choose a department.' using errcode = 'check_violation';
  end if;
  if p_department_id is not null
     and not exists (select 1 from public.departments d where d.id = p_department_id) then
    raise exception 'Choose a department.' using errcode = 'foreign_key_violation';
  end if;
  if p_position_id is not null
     and not exists (select 1 from public.positions pos where pos.id = p_position_id) then
    raise exception 'Choose a position.' using errcode = 'foreign_key_violation';
  end if;

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
    select 1 from public.people p where p.university_id = v_uni and p.slug = v_slug
  ) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.people (
    university_id, slug, full_name, display_name, headline,
    gender, primary_category, teacher_type, is_active, is_verified
  )
  values (
    v_uni, v_slug, v_name, v_disp, v_head,
    p_gender, p_category, v_tt, true, false
  )
  returning id into v_id;

  -- Primary role.
  insert into public.person_roles (person_id, category, department_id, position_id, is_primary, is_active)
  values (v_id, p_category, p_department_id, p_position_id, true, true);

  -- Internal teacher -> Faculty role auto (department same, primary nahi).
  if p_category = 'teacher' and v_tt = 'internal' then
    insert into public.person_roles (person_id, category, department_id, position_id, is_primary, is_active)
    values (v_id, 'faculty', p_department_id, null, false, true);
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid, 'person.create', 'person', v_id,
    jsonb_build_object('name', v_name, 'category', p_category, 'teacherType', v_tt)
  );

  return v_id;
end;
$$;

comment on function public.admin_create_person(text, public.person_category, public.person_gender, public.teacher_type, uuid, uuid, text, text) is
  'Person banao (README §28-§30). Internal teacher -> Faculty auto + department zaroori. ONE PERSON = ONE PROFILE.';

-- =============================================================================
-- 4) PEOPLE - update core fields. is_active yahan NAHI (set_person_active §51).
--    slug + primary_category LOCK (identity/URL stable). teacher_type sirf tab
--    rakhi jati hai jab person Teacher ho.
-- =============================================================================
create or replace function public.admin_update_person(
  p_id           uuid,
  p_full_name    text,
  p_display_name text,
  p_title_prefix text,
  p_headline     text,
  p_bio          text,
  p_gender       public.person_gender,
  p_teacher_type public.teacher_type,
  p_is_verified  boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  v_id   uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_name := nullif(btrim(coalesce(p_full_name, '')), '');
  if v_name is null then
    raise exception 'A name is required.' using errcode = 'check_violation';
  end if;

  update public.people
     set full_name    = v_name,
         display_name = nullif(btrim(coalesce(p_display_name, '')), ''),
         title_prefix = nullif(btrim(coalesce(p_title_prefix, '')), ''),
         headline     = nullif(btrim(coalesce(p_headline, '')), ''),
         bio          = nullif(btrim(coalesce(p_bio, '')), ''),
         gender       = p_gender,
         teacher_type = case when primary_category = 'teacher' then p_teacher_type else null end,
         is_verified  = coalesce(p_is_verified, is_verified),
         updated_at   = now()
   where id = p_id
  returning id into v_id;

  if v_id is null then
    raise exception 'That item is not available.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid, 'person.update', 'person', v_id,
    jsonb_build_object('name', v_name, 'isVerified', coalesce(p_is_verified, false))
  );

  return v_id;
end;
$$;

comment on function public.admin_update_person(uuid, text, text, text, text, text, public.person_gender, public.teacher_type, boolean) is
  'Person ke core fields update. is_active/slug/category yahan nahi.';

-- =============================================================================
-- 5) ROLES - add / set-active / set-primary
-- =============================================================================
create or replace function public.admin_add_role(
  p_person_id     uuid,
  p_category      public.person_category,
  p_department_id uuid,
  p_position_id   uuid,
  p_is_primary    boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_primary boolean := coalesce(p_is_primary, false);
  v_id      uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;
  if p_category is null then
    raise exception 'Choose a category.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.people p where p.id = p_person_id) then
    raise exception 'That item is not available.' using errcode = 'no_data_found';
  end if;
  if p_department_id is not null
     and not exists (select 1 from public.departments d where d.id = p_department_id) then
    raise exception 'Choose a department.' using errcode = 'foreign_key_violation';
  end if;
  if p_position_id is not null
     and not exists (select 1 from public.positions pos where pos.id = p_position_id) then
    raise exception 'Choose a position.' using errcode = 'foreign_key_violation';
  end if;

  if exists (
    select 1 from public.person_roles r
     where r.person_id = p_person_id
       and r.category = p_category
       and r.department_id is not distinct from p_department_id
       and r.position_id is not distinct from p_position_id
  ) then
    raise exception 'That role already exists.' using errcode = 'unique_violation';
  end if;

  -- Ek hi primary. Naya primary ban raha hai to baaki clear.
  if v_primary then
    update public.person_roles set is_primary = false, updated_at = now()
     where person_id = p_person_id and is_primary;
  end if;

  insert into public.person_roles (person_id, category, department_id, position_id, is_primary, is_active)
  values (p_person_id, p_category, p_department_id, p_position_id, v_primary, true)
  returning id into v_id;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid, 'role.add', 'person_role', v_id,
    jsonb_build_object('personId', p_person_id, 'category', p_category, 'isPrimary', v_primary)
  );

  return v_id;
end;
$$;

comment on function public.admin_add_role(uuid, public.person_category, uuid, uuid, boolean) is
  'Person me role add. Duplicate (category+dept+position) reject. Ek hi primary.';

create or replace function public.admin_set_role_active(p_role_id uuid, p_active boolean)
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

  -- Deactivate karte waqt primary bhi hata do (inactive primary na rahe).
  update public.person_roles
     set is_active  = coalesce(p_active, is_active),
         is_primary = case when coalesce(p_active, is_active) then is_primary else false end,
         updated_at = now()
   where id = p_role_id
  returning id into v_id;

  if v_id is null then
    raise exception 'That item is not available.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when coalesce(p_active, false) then 'role.activate' else 'role.deactivate' end,
    'person_role', v_id, jsonb_build_object('isActive', coalesce(p_active, false))
  );
end;
$$;

comment on function public.admin_set_role_active(uuid, boolean) is
  'Role active/inactive. Deactivate par primary hat jata hai.';

create or replace function public.admin_set_primary_role(p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_person uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  select r.person_id into v_person
    from public.person_roles r
   where r.id = p_role_id and r.is_active;
  if v_person is null then
    raise exception 'That item is not available.' using errcode = 'no_data_found';
  end if;

  update public.person_roles set is_primary = false, updated_at = now()
   where person_id = v_person and is_primary and id <> p_role_id;

  update public.person_roles set is_primary = true, updated_at = now()
   where id = p_role_id;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'role.primary', 'person_role', p_role_id,
          jsonb_build_object('personId', v_person));
end;
$$;

comment on function public.admin_set_primary_role(uuid) is
  'Is role ko primary banao (baaki clear). Sirf active role.';

-- =============================================================================
-- 6) ASSIGNMENTS - add (offering find-or-create) / set-active
-- =============================================================================
create or replace function public.admin_add_assignment(
  p_person_id   uuid,
  p_course_id   uuid,
  p_semester_id uuid,
  p_section     text,
  p_category    public.person_category
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_section text := nullif(btrim(coalesce(p_section, '')), '');
  v_cat     public.person_category;
  v_off     uuid;
  v_id      uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.people p where p.id = p_person_id) then
    raise exception 'That item is not available.' using errcode = 'no_data_found';
  end if;
  if p_course_id is null
     or not exists (select 1 from public.courses c where c.id = p_course_id) then
    raise exception 'Choose a course.' using errcode = 'foreign_key_violation';
  end if;
  if p_semester_id is null
     or not exists (select 1 from public.semesters s where s.id = p_semester_id) then
    raise exception 'Choose a semester.' using errcode = 'foreign_key_violation';
  end if;

  v_cat := coalesce(
    p_category,
    (select p.primary_category from public.people p where p.id = p_person_id),
    'teacher'
  );

  -- Offering find-or-create (course + semester + section, nulls-not-distinct).
  select o.id into v_off
    from public.course_offerings o
   where o.course_id = p_course_id
     and o.semester_id = p_semester_id
     and o.section is not distinct from v_section;
  if v_off is null then
    insert into public.course_offerings (course_id, semester_id, section, is_active)
    values (p_course_id, p_semester_id, v_section, true)
    returning id into v_off;
  end if;

  if exists (
    select 1 from public.teacher_assignments a
     where a.person_id = p_person_id and a.course_offering_id = v_off
  ) then
    raise exception 'That assignment already exists.' using errcode = 'unique_violation';
  end if;

  insert into public.teacher_assignments (person_id, course_offering_id, category, is_active)
  values (p_person_id, v_off, v_cat, true)
  returning id into v_id;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid, 'assignment.add', 'teacher_assignment', v_id,
    jsonb_build_object('personId', p_person_id, 'courseId', p_course_id, 'semesterId', p_semester_id)
  );

  return v_id;
end;
$$;

comment on function public.admin_add_assignment(uuid, uuid, uuid, text, public.person_category) is
  'Person ko course+semester assign karo. Offering na ho to ban jati hai. Duplicate reject.';

create or replace function public.admin_set_assignment_active(p_assignment_id uuid, p_active boolean)
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

  update public.teacher_assignments
     set is_active = coalesce(p_active, is_active), updated_at = now()
   where id = p_assignment_id
  returning id into v_id;

  if v_id is null then
    raise exception 'That item is not available.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when coalesce(p_active, false) then 'assignment.activate' else 'assignment.deactivate' end,
    'teacher_assignment', v_id, jsonb_build_object('isActive', coalesce(p_active, false))
  );
end;
$$;

comment on function public.admin_set_assignment_active(uuid, boolean) is
  'Assignment active/inactive (archival). Delete nahi.';

-- =============================================================================
-- 7) VIEWERS - Students (account fields, admin-only) + Audit Logs
--    Students REVIEWS se kabhi join nahi (anonymity mehfooz).
-- =============================================================================
create or replace function public.admin_students_list(
  p_search text,
  p_status text,
  p_limit  int,
  p_offset int
)
returns table (
  id          uuid,
  email       text,
  role        public.app_role,
  is_active   boolean,
  created_at  timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_status text := lower(coalesce(nullif(btrim(p_status), ''), 'all'));
  v_limit  int  := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset int  := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;
  if v_status not in ('all', 'active', 'inactive') then
    v_status := 'all';
  end if;

  return query
    select
      pr.id, pr.email, pr.role, pr.is_active, pr.created_at,
      count(*) over()
    from public.profiles pr
    where (v_search is null or pr.email ilike '%' || v_search || '%')
      and (
        v_status = 'all'
        or (v_status = 'active'   and pr.is_active)
        or (v_status = 'inactive' and not pr.is_active)
      )
    order by pr.created_at desc
    limit v_limit offset v_offset;
end;
$$;

comment on function public.admin_students_list(text, text, int, int) is
  'Admin students/accounts viewer. REVIEWS se join NAHI (anonymity).';

create or replace function public.admin_audit_list(
  p_entity_type text,
  p_limit       int,
  p_offset      int
)
returns table (
  id          uuid,
  actor_id    uuid,
  actor_email text,
  action      text,
  entity_type text,
  entity_id   uuid,
  details     jsonb,
  created_at  timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_entity text := nullif(btrim(coalesce(p_entity_type, '')), '');
  v_limit  int  := greatest(1, least(coalesce(p_limit, 50), 200));
  v_offset int  := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  return query
    select
      al.id, al.actor_id, pr.email, al.action, al.entity_type, al.entity_id,
      al.details, al.created_at,
      count(*) over()
    from public.admin_audit_log al
    left join public.profiles pr on pr.id = al.actor_id
    where (v_entity is null or al.entity_type = v_entity)
    order by al.created_at desc
    limit v_limit offset v_offset;
end;
$$;

comment on function public.admin_audit_list(text, int, int) is
  'Admin audit-log viewer (actor email, paginated, total_count).';

-- =============================================================================
-- 8) GRANTS. Revoke-before-grant; sirf authenticated (andar is_admin() gate).
-- =============================================================================
revoke all on function public.admin_people_list(public.person_category, text, text, int, int)                                        from public, anon, authenticated;
revoke all on function public.admin_get_person(uuid)                                                                                 from public, anon, authenticated;
revoke all on function public.admin_person_roles(uuid)                                                                               from public, anon, authenticated;
revoke all on function public.admin_person_assignments(uuid)                                                                         from public, anon, authenticated;
revoke all on function public.admin_create_person(text, public.person_category, public.person_gender, public.teacher_type, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_update_person(uuid, text, text, text, text, text, public.person_gender, public.teacher_type, boolean) from public, anon, authenticated;
revoke all on function public.admin_add_role(uuid, public.person_category, uuid, uuid, boolean)                                       from public, anon, authenticated;
revoke all on function public.admin_set_role_active(uuid, boolean)                                                                   from public, anon, authenticated;
revoke all on function public.admin_set_primary_role(uuid)                                                                           from public, anon, authenticated;
revoke all on function public.admin_add_assignment(uuid, uuid, uuid, text, public.person_category)                                   from public, anon, authenticated;
revoke all on function public.admin_set_assignment_active(uuid, boolean)                                                             from public, anon, authenticated;
revoke all on function public.admin_students_list(text, text, int, int)                                                             from public, anon, authenticated;
revoke all on function public.admin_audit_list(text, int, int)                                                                       from public, anon, authenticated;

grant execute on function public.admin_people_list(public.person_category, text, text, int, int)                                     to authenticated;
grant execute on function public.admin_get_person(uuid)                                                                              to authenticated;
grant execute on function public.admin_person_roles(uuid)                                                                            to authenticated;
grant execute on function public.admin_person_assignments(uuid)                                                                      to authenticated;
grant execute on function public.admin_create_person(text, public.person_category, public.person_gender, public.teacher_type, uuid, uuid, text, text) to authenticated;
grant execute on function public.admin_update_person(uuid, text, text, text, text, text, public.person_gender, public.teacher_type, boolean) to authenticated;
grant execute on function public.admin_add_role(uuid, public.person_category, uuid, uuid, boolean)                                    to authenticated;
grant execute on function public.admin_set_role_active(uuid, boolean)                                                                to authenticated;
grant execute on function public.admin_set_primary_role(uuid)                                                                        to authenticated;
grant execute on function public.admin_add_assignment(uuid, uuid, uuid, text, public.person_category)                                to authenticated;
grant execute on function public.admin_set_assignment_active(uuid, boolean)                                                          to authenticated;
grant execute on function public.admin_students_list(text, text, int, int)                                                          to authenticated;
grant execute on function public.admin_audit_list(text, int, int)                                                                    to authenticated;

commit;
