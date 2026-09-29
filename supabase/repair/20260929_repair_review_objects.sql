-- =============================================================================
-- REPAIR: review objects ko unki AAKHRI (final) halat par le aata hai.
--
-- KYUN: migrations agar original timestamp order ke bajaye kisi aur tarteeb me
-- apply hui thi, to `submit_review` ka purana version ya `person_rating_stats`
-- ke sirf 5 buckets DB me reh gaye. Nateeja:
--   * review submit karne par "We could not save your review right now." aata hai
--   * public profile par counts/averages theek show nahi hote
--
-- YEH SCRIPT SIRF DO CHEEZEIN DOBARA ASSERT KARTA HAI (koi table nahi banata,
-- koi data nahi girata):
--   1) person_rating_stats view -> 10 buckets (count_1..count_10), security_invoker
--   2) submit_review -> aakhri 6-argument version (feature-lock ke saath)
--
-- MEHFOOZ HAI KYUN:
--   * View ko sirf FUNCTIONS join karti hain (koi dependent view/matview nahi),
--     is liye plain `drop view` cascade ke baghair chalta hai aur functions
--     baad me bhi theek chalti hain (woh call ke waqt view resolve karti hain).
--   * Function `create or replace` hai - signature same, sirf body refresh.
--   * Sab kuch ek transaction me hai: kahin error aaye to kuch nahi badlega.
--
-- KAISE CHALAYEN: Supabase Dashboard -> SQL Editor -> yeh poora file paste ->
-- Run. Ek dafa. (migrations folder me NAHI - yeh ek repair script hai.)
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) person_rating_stats: 10 buckets (source of truth = migration 20260922100000)
-- -----------------------------------------------------------------------------
drop view if exists public.person_rating_stats;

create view public.person_rating_stats
with (security_invoker = on) as
  select
    r.person_id,
    count(*)::int                                       as review_count,
    round(avg(r.overall_rating)::numeric, 2)            as average_rating,
    count(*) filter (where r.overall_rating = 10)::int  as count_10,
    count(*) filter (where r.overall_rating = 9)::int   as count_9,
    count(*) filter (where r.overall_rating = 8)::int   as count_8,
    count(*) filter (where r.overall_rating = 7)::int   as count_7,
    count(*) filter (where r.overall_rating = 6)::int   as count_6,
    count(*) filter (where r.overall_rating = 5)::int   as count_5,
    count(*) filter (where r.overall_rating = 4)::int   as count_4,
    count(*) filter (where r.overall_rating = 3)::int   as count_3,
    count(*) filter (where r.overall_rating = 2)::int   as count_2,
    count(*) filter (where r.overall_rating = 1)::int   as count_1
  from public.reviews r
  where r.status = 'published'
  group by r.person_id;

comment on view public.person_rating_stats is
  'Published reviews ka per-person summary, overall 1-10. security_invoker=on - caller ki RLS lagti hai.';

grant select on public.person_rating_stats to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) submit_review: aakhri 6-arg version (source of truth = 20260925093000)
-- -----------------------------------------------------------------------------
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
  v_has_assign    boolean;
begin
  if v_uid is null then
    raise exception 'You must be signed in to post a review.' using errcode = 'insufficient_privilege';
  end if;

  if not public.feature_enabled('review_submission') then
    raise exception 'New reviews are paused right now. Please try again later.'
      using errcode = 'check_violation';
  end if;

  if not public.is_verified_student() then
    raise exception 'Your account cannot post reviews yet.' using errcode = 'insufficient_privilege';
  end if;

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

    select exists (
      select 1
        from public.teacher_assignments ta
        join public.course_offerings co on co.id = ta.course_offering_id and co.is_active
       where ta.person_id = p_person_id and ta.is_active
    ) into v_has_assign;

    if v_has_assign then
      if not exists (
        select 1
          from public.teacher_assignments ta
          join public.course_offerings co on co.id = ta.course_offering_id and co.is_active
         where ta.person_id = p_person_id
           and ta.is_active
           and co.course_id = p_course_id
           and co.semester_id = p_semester_id
      ) then
        raise exception 'That course and semester do not match this profile.'
          using errcode = 'check_violation';
      end if;
    else
      if not exists (
        select 1
          from public.person_roles pr
          join public.departments d on d.id = pr.department_id and d.is_active
          join public.courses c on c.department_id = d.id and c.is_active
         where pr.person_id = p_person_id
           and pr.is_active
           and c.id = p_course_id
      ) then
        raise exception 'That course does not match this profile.'
          using errcode = 'check_violation';
      end if;
    end if;

    v_course_id := p_course_id;
  else
    v_course_id := null;
  end if;

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

comment on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid) is
  'Naya review. review_submission feature lock, phir verified student, context, uniqueness, limit, answers.';

revoke all on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid) from public, anon, authenticated;
grant execute on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid) to authenticated;

commit;

-- =============================================================================
-- Baad me tasdeeq (yeh do query alag se chala kar dekh lein):
--
--   -- (a) 6-arg submit_review mojood hai?
--   select p.oid::regprocedure as signature
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname='public' and p.proname='submit_review';
--   -- expected me yeh line honi chahiye:
--   --   submit_review(uuid, smallint, text, jsonb, uuid, uuid)
--
--   -- (b) view ke 10 buckets mojood hain?
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='person_rating_stats'
--    order by ordinal_position;
--   -- count_1 se count_10 tak sab dikhne chahiyen.
-- =============================================================================
