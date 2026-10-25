-- Review burst handling: retain authorization, scopes and moderation rules.
-- Apply only this migration to a project with the existing review catalog migrations.
begin;

create index if not exists review_authors_author_created_idx
  on public.review_authors (author_id, created_at desc);
create index if not exists reviews_person_created_published_idx
  on public.reviews (person_id, created_at desc) where status = 'published';

-- The homepage searches full_name OR display_name; index those predicates separately.
do $$
declare
  v_schema text;
begin
  select n.nspname into v_schema
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'pg_trgm';
  if v_schema is not null then
    execute format('create index if not exists people_full_name_trgm_idx on public.people using gin (full_name %I.gin_trgm_ops) where is_active', v_schema);
    execute format('create index if not exists people_display_name_trgm_idx on public.people using gin (display_name %I.gin_trgm_ops) where is_active', v_schema);
  else
    raise notice 'Enable pg_trgm for indexed partial name searches.';
  end if;
end;
$$;

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
  v_constraint    text;
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

  -- One short transaction per student. Other students use different rows.
  -- NOWAIT keeps accidental parallel submissions from occupying the connection pool.
  -- NO KEY UPDATE remains compatible with foreign-key checks on profiles.
  begin
    perform 1 from public.profiles
     where id = v_uid
     for no key update nowait;
  exception when lock_not_available then
    raise exception 'Another review is being saved from your account. Please try again in a moment.'
      using errcode = 'lock_not_available';
  end;

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

  begin
    insert into public.review_authors (
      review_id, author_id, person_id, category, course_id, semester_id
    )
    values (v_review_id, v_uid, p_person_id, v_category, v_course_id, p_semester_id);
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'review_authors_course_scope_idx' then
      raise exception 'You have already reviewed this course for this semester.'
        using errcode = 'unique_violation';
    elsif v_constraint = 'review_authors_period_scope_idx' then
      raise exception 'You have already reviewed this person for this semester.'
        using errcode = 'unique_violation';
    else
      raise;
    end if;
  end;

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

revoke all on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid)
  to authenticated;

comment on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid) is
  'Atomic review save. Per-student NOWAIT guard protects duplicate checks and daily limits without serializing different students.';

notify pgrst, 'reload schema';
commit;

select
  position('for no key update nowait' in pg_get_functiondef(
    'public.submit_review(uuid,smallint,text,jsonb,uuid,uuid)'::regprocedure
  )) > 0 as concurrent_review_guard_ready,
  to_regclass('public.review_authors_author_created_idx') is not null as review_daily_limit_index_ready,
  to_regclass('public.reviews_person_created_published_idx') is not null as public_review_index_ready;
