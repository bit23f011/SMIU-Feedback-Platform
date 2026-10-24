-- Shared lists: admin courses/semesters ek baar save kare, phir sirf teacher cards banaye.
-- Student authorization, review questions, moderation aur rating rules wohi rahen.
-- Internal teacher ka faculty role trigger se banta hai; duplicate insert hatao.
begin;

create or replace function public.submit_review(
  p_person_id   uuid,
  p_overall     smallint,
  p_comment     text,
  p_answers     jsonb,
  p_course_id   uuid default null,
  p_semester_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid           uuid := auth.uid();
  v_category      public.person_category;
  v_comment       text;
  v_words         int;
  v_review_id     uuid;
  v_expected      int;
  v_inserted      int;
  v_today         int;
  v_max_day       int;
  v_needs_course  boolean;
  v_course_id     uuid;
begin
  if v_uid is null then
    raise exception 'You must be signed in to post a review.' using errcode = 'insufficient_privilege';
  end if;

  -- FEATURE LOCK (README §55). Server time hi authority. Browser me chhupana kaafi
  -- nahi; asli rok yahan hai.
  if not public.feature_enabled('review_submission') then
    raise exception 'New reviews are paused right now. Please try again later.'
      using errcode = 'check_violation';
  end if;

  -- Verified + active student hi likh sakta hai. Yeh check DB me hai, browser me nahi.
  if not public.is_verified_student() then
    raise exception 'Your account cannot post reviews yet.' using errcode = 'insufficient_privilege';
  end if;

  -- Banda mojood aur active ho. Category review ke waqt freeze hoti hai.
  select p.primary_category into v_category
    from public.people p
   where p.id = p_person_id and p.is_active;

  if not found then
    raise exception 'That profile is not available.' using errcode = 'no_data_found';
  end if;

  if v_category is null then
    raise exception 'That profile cannot be reviewed yet.' using errcode = 'check_violation';
  end if;

  v_needs_course := v_category in ('teacher', 'lab_instructor');

  -- ---------------------------------------------------------------------------
  -- Context: semester hamesha, course sirf parhane walon par (README §25)
  -- ---------------------------------------------------------------------------
  if p_semester_id is null then
    raise exception 'Choose the semester this review is about.' using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.semesters s where s.id = p_semester_id) then
    raise exception 'Choose a valid semester.' using errcode = 'no_data_found';
  end if;

  if v_needs_course then
    if p_course_id is null then
      raise exception 'Choose the course this review is about.' using errcode = 'check_violation';
    end if;

    if not exists (
      select 1 from public.courses c where c.id = p_course_id and c.is_active
    ) then
      raise exception 'Choose a valid course.' using errcode = 'no_data_found';
    end if;

    -- Shared list: is university ka koi bhi active course chalega.
    if not exists (
      select 1
        from public.courses c
        join public.departments d on d.id = c.department_id and d.is_active
        join public.universities u on u.id = d.university_id and u.is_active
       where c.id = p_course_id and c.is_active
         and d.university_id = (select p.university_id from public.people p where p.id = p_person_id)
    ) then
      raise exception 'Choose a valid course.' using errcode = 'no_data_found';
    end if;

    v_course_id := p_course_id;
  else
    v_course_id := null;
  end if;

  -- UNIQUENESS (README §25).
  if v_course_id is not null then
    if exists (
      select 1 from public.review_authors ra
       where ra.author_id   = v_uid
         and ra.person_id   = p_person_id
         and ra.course_id   = v_course_id
         and ra.semester_id = p_semester_id
    ) then
      raise exception 'You have already reviewed this course for this semester.'
        using errcode = 'unique_violation';
    end if;
  else
    if exists (
      select 1 from public.review_authors ra
       where ra.author_id   = v_uid
         and ra.person_id   = p_person_id
         and ra.category    = v_category
         and ra.course_id is null
         and ra.semester_id = p_semester_id
    ) then
      raise exception 'You have already reviewed this person for this semester.'
        using errcode = 'unique_violation';
    end if;
  end if;

  -- Rate limit.
  select max_per_day into v_max_day from public.review_limits();

  select count(*)::int into v_today
    from public.review_authors ra
   where ra.author_id = v_uid
     and ra.created_at > now() - interval '24 hours';

  if v_today >= v_max_day then
    raise exception 'You have reached the daily limit for new reviews.' using errcode = 'check_violation';
  end if;

  if p_overall is null or p_overall < 1 or p_overall > 10 then
    raise exception 'Give an overall rating between 1 and 10.' using errcode = 'check_violation';
  end if;

  v_comment := nullif(btrim(coalesce(p_comment, '')), '');

  if v_comment is not null then
    v_words := coalesce(array_length(regexp_split_to_array(v_comment, '\s+'), 1), 0);

    if v_words > 150 then
      raise exception 'Keep your comment to 150 words or fewer.' using errcode = 'check_violation';
    end if;

    if char_length(v_comment) > 1500 then
      raise exception 'Your comment is too long. Please shorten it.' using errcode = 'check_violation';
    end if;
  end if;

  insert into public.reviews (
    person_id, category, overall_rating, comment, course_id, semester_id, moderation_status
  )
  values (
    p_person_id,
    v_category,
    p_overall,
    v_comment,
    v_course_id,
    p_semester_id,
    case when v_comment is null
         then 'none'::public.review_moderation_status
         else 'pending'::public.review_moderation_status
    end
  )
  returning id into v_review_id;

  insert into public.review_authors (
    review_id, author_id, person_id, category, course_id, semester_id
  )
  values (v_review_id, v_uid, p_person_id, v_category, v_course_id, p_semester_id);

  insert into public.review_answers (review_id, criterion_id, star_value, bool_value)
  select
    v_review_id,
    c.id,
    case when c.kind = 'star'   then (a.star)::smallint end,
    case when c.kind = 'yes_no' then a.yes end
  from jsonb_to_recordset(coalesce(p_answers, '[]'::jsonb))
         as a(key text, star int, yes boolean)
  join public.review_criteria c
    on c.key = a.key and c.category = v_category and c.is_active;

  get diagnostics v_inserted = row_count;

  select count(*)::int into v_expected
    from public.review_criteria c
   where c.category = v_category and c.is_active;

  if v_inserted <> v_expected then
    raise exception 'Please answer every question before posting.' using errcode = 'check_violation';
  end if;

  return v_review_id;
end;
$$;

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

  -- Teacher role ka trigger faculty bana chuka hota hai; doosri row na banao.
  -- Yeh idempotent helper auto flag aur teacher ki position bhi sahi rakhta hai.
  perform public.apply_internal_teacher_faculty(v_id);

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid, 'person.create', 'person', v_id,
    jsonb_build_object('name', v_name, 'category', p_category, 'teacherType', v_tt)
  );

  return v_id;
end;
$$;

create or replace function public.admin_add_course_list(
  p_department_id uuid,
  p_courses jsonb
)
returns table (added int, skipped int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_title text;
  v_code text;
  v_added int := 0;
  v_skipped int := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1
      from public.departments d
      join public.universities u on u.id = d.university_id and u.is_active
     where d.id = p_department_id and d.is_active
  ) then
    raise exception 'Choose a department.' using errcode = 'foreign_key_violation';
  end if;

  if jsonb_typeof(p_courses) is distinct from 'array' then
    raise exception 'Enter a valid course list.' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(p_courses) not between 1 and 200 then
    raise exception 'Enter a valid course list.' using errcode = 'check_violation';
  end if;

  -- Do bulk saves ek hi department me saath aayein to duplicate course na bane.
  perform pg_advisory_xact_lock(hashtextextended('profaura:course-list:' || p_department_id::text, 0));

  for v_item in select value from jsonb_array_elements(p_courses) loop
    if jsonb_typeof(v_item) is distinct from 'object'
       or jsonb_typeof(v_item->'title') is distinct from 'string'
       or coalesce(jsonb_typeof(v_item->'code'), 'null') not in ('string', 'null') then
      raise exception 'Enter a valid course list.' using errcode = 'check_violation';
    end if;

    v_title := btrim(v_item->>'title');
    v_code := nullif(btrim(v_item->>'code'), '');
    if char_length(v_title) not between 1 and 160
       or coalesce(char_length(v_code), 0) > 32 then
      raise exception 'Enter a valid course list.' using errcode = 'check_violation';
    end if;

    -- Pehle se saved course ke ID, code aur archive flag ko chhoona nahi.
    if exists (
      select 1 from public.courses c
       where c.department_id = p_department_id and lower(btrim(c.title)) = lower(v_title)
    ) then
      v_skipped := v_skipped + 1;
    else
      perform public.admin_upsert_course(null, v_title, v_code, null, p_department_id, null, true);
      v_added := v_added + 1;
    end if;
  end loop;

  return query select v_added, v_skipped;
end;
$$;

comment on function public.admin_add_course_list(uuid, jsonb) is
  'Admin ki shared course list. Ek transaction, 1-200 entries; existing titles preserve/skip hote hain.';

create or replace function public.admin_add_semester_list(p_semesters jsonb)
returns table (added int, skipped int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_label text;
  v_season public.semester_season;
  v_year int;
  v_added int := 0;
  v_skipped int := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  if jsonb_typeof(p_semesters) is distinct from 'array' then
    raise exception 'Enter a valid semester list.' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(p_semesters) not between 1 and 200 then
    raise exception 'Enter a valid semester list.' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('profaura:semester-list', 0));

  for v_item in select value from jsonb_array_elements(p_semesters) loop
    if jsonb_typeof(v_item) is distinct from 'object'
       or jsonb_typeof(v_item->'label') is distinct from 'string'
       or jsonb_typeof(v_item->'season') is distinct from 'string'
       or jsonb_typeof(v_item->'year') is distinct from 'number' then
      raise exception 'Enter a valid semester list.' using errcode = 'check_violation';
    end if;

    v_label := btrim(v_item->>'label');
    if char_length(v_label) not between 1 and 160
       or (v_item->>'season') not in ('spring', 'summer', 'fall', 'winter')
       or (v_item->>'year') !~ '^[0-9]{4}$' then
      raise exception 'Enter a valid semester list.' using errcode = 'check_violation';
    end if;

    v_season := (v_item->>'season')::public.semester_season;
    v_year := (v_item->>'year')::int;
    if v_year not between 2000 and 2100 then
      raise exception 'Enter a valid semester list.' using errcode = 'check_violation';
    end if;

    -- Mojooda current semester, label aur dates save par bilkul mehfooz rahen.
    if exists (
      select 1 from public.semesters s where s.season = v_season and s.year = v_year
    ) then
      v_skipped := v_skipped + 1;
    else
      perform public.admin_upsert_semester(null, v_label, v_season, v_year, false, null, null);
      v_added := v_added + 1;
    end if;
  end loop;

  return query select v_added, v_skipped;
end;
$$;

comment on function public.admin_add_semester_list(jsonb) is
  'Admin ki shared semester list. Ek transaction, 1-200 entries; existing season/year preserve/skip hote hain.';

revoke all on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.admin_add_course_list(uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.admin_add_semester_list(jsonb)
  from public, anon, authenticated;
revoke all on function public.admin_create_person(text, public.person_category, public.person_gender, public.teacher_type, uuid, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid)
  to authenticated;
grant execute on function public.admin_add_course_list(uuid, jsonb)
  to authenticated;
grant execute on function public.admin_add_semester_list(jsonb)
  to authenticated;
grant execute on function public.admin_create_person(text, public.person_category, public.person_gender, public.teacher_type, uuid, uuid, text, text)
  to authenticated;

notify pgrst, 'reload schema';

commit;

-- SQL Editor me in chaaron ka true aana update apply hone ki tasdeeq hai.
select
  to_regprocedure('public.admin_add_course_list(uuid,jsonb)') is not null as course_list_ready,
  to_regprocedure('public.admin_add_semester_list(jsonb)') is not null as semester_list_ready,
  position('Shared list:' in pg_get_functiondef(
    'public.submit_review(uuid,smallint,text,jsonb,uuid,uuid)'::regprocedure
  )) > 0 as shared_review_courses_ready,
  position('public.apply_internal_teacher_faculty(v_id)' in pg_get_functiondef(
    'public.admin_create_person(text,public.person_category,public.person_gender,public.teacher_type,uuid,uuid,text,text)'::regprocedure
  )) > 0 as teacher_card_creation_ready;

