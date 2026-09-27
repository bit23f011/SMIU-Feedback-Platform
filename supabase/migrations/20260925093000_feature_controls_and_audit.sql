-- =============================================================================
-- 20260925093000_feature_controls_and_audit.sql
--
-- Phase 5 (README §55 Feature Controls, §103 Audit Logging) ki DB buniyaad.
--
-- ISME KYA HAI:
--   1) public.feature_flags        - admin ke chaar switch (signup, review
--      submit, review edit, email-domain lock), manual + scheduled, server time
--      hi authority.
--   2) public.feature_enabled(key) - ek switch abhi ON hai ya nahi, yeh faisla
--      SIRF yahan hota hai (now() server par). Frontend is ka natija sirf
--      dikhata hai.
--   3) public.write_audit(...)     - har hassas admin action ka record likhne ka
--      ek hi raasta (admin_audit_log pehle se mojood hai).
--   4) submit_review / update_my_review me ek-ek gate line: agar switch OFF ho
--      to DB khud rok deti hai. (enforce_university_email me signup + domain lock
--      niche alag se lagta hai.)
--
-- SAFETY (README §27):
--   * Koi table drop nahi. admin_audit_log aur baaki sab waise ke waise.
--   * submit_review / update_my_review ko create-or-replace/ drop+create se
--     dobara banaya gaya hai HUBAHU purani body ke sath, sirf ek gate line aur
--     (domain lock ke liye) email trigger me ek branch add hui hai.
--   * Signatures wahi hain, is liye grants qaim; ehtiyatan revoke/grant dobara.
--   * Har switch ka DEFAULT mehfooz taraf hai: signup/submit/edit ON (site
--     abhi jaise chal rahi hai), domain lock LOCKED (sirf university email).
--   * Fail-safe: agar kisi switch ka row hi na ho, feature_enabled() us ke
--     default par chala jata hai (neeche seed se row bhi daal di hai).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) feature_flags
--    Ek row per feature. `is_enabled` manual switch hai. Agar scheduled window
--    diya ho (starts_at/ends_at) to us window ke bahar feature OFF samjha jata
--    hai, chahe is_enabled true ho. Yani schedule sirf window ke ANDAR chalne
--    deta hai. Dono null = koi schedule nahi, sirf manual switch.
-- -----------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key         text primary key,
  label       text not null,
  is_enabled  boolean not null default true,
  -- Optional scheduled window. Server time (now()) hi in ko judge karta hai.
  starts_at   timestamptz,
  ends_at     timestamptz,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null,
  -- Dono time diye hon to end start ke baad ho.
  check (starts_at is null or ends_at is null or ends_at >= starts_at)
);

comment on table public.feature_flags is
  'Admin ke feature switch (README §55). is_enabled manual hai; starts_at/ends_at optional schedule. Faisla feature_enabled() me hota hai.';
comment on column public.feature_flags.is_enabled is
  'Manual switch. Schedule ke sath AND hota hai: window ke bahar feature OFF.';

drop trigger if exists feature_flags_set_updated_at on public.feature_flags;
create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

-- Chaar canonical switch (README §55). Sab ka default MEHFOOZ taraf.
-- signup/submit/edit ON = site abhi jaise chal rahi hai. domain_lock ON = LOCKED
-- (sirf university domain). Row pehle se ho to koi cheez override nahi hoti.
insert into public.feature_flags (key, label, is_enabled) values
  ('student_signup',    'Student signup',            true),
  ('review_submission', 'Review submission',         true),
  ('review_editing',    'Review editing',            true),
  ('email_domain_lock', 'Student email domain lock', true)
on conflict (key) do nothing;

-- feature_flags par koi client grant NAHI. Padhna feature_enabled() se, likhna
-- admin RPC se (agli migration me). RLS on, magar koi policy nahi = default deny.
alter table public.feature_flags enable row level security;

-- -----------------------------------------------------------------------------
-- 2) feature_enabled(key)
--    Ek switch abhi ON hai ya nahi. Manual switch AND (schedule window ke andar).
--    Row na mile to fail-safe default: sab features true, siwaye un ke jinhe
--    hum jaante hain (yahan koi aisa nahi), is liye true.
--
--    SECURITY DEFINER: feature_flags par kisi role ko select grant nahi, is liye
--    yeh function definer ke tor par parhti hai. Koi private data nahi deti, sirf
--    boolean. Har role isay chala sakta hai (public pages ko bhi chahiye ho to).
-- -----------------------------------------------------------------------------
create or replace function public.feature_enabled(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select f.is_enabled
             and (f.starts_at is null or f.starts_at <= now())
             and (f.ends_at   is null or now() <  f.ends_at)
        from public.feature_flags f
       where f.key = p_key
    ),
    -- Row hi nahi mila: fail-safe. Domain lock ka default LOCKED (true) hona
    -- chahiye, is liye us key ke liye true, baaki sab bhi true (site chalti rahe).
    true
  );
$$;

comment on function public.feature_enabled(text) is
  'Ek feature switch abhi ON hai? Manual switch AND server-time schedule window. Row na ho to fail-safe true.';

-- -----------------------------------------------------------------------------
-- 3) write_audit(...)
--    Har hassas admin action ka record (README §103). Sirf admin call kar sake.
--    actor hamesha auth.uid() se, client se nahi. details me kabhi secret nahi.
-- -----------------------------------------------------------------------------
create or replace function public.write_audit(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid default null,
  p_details     jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_details)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.write_audit(text, text, uuid, jsonb) is
  'Admin action ka audit record (README §103). actor auth.uid() se; sirf admin.';

-- -----------------------------------------------------------------------------
-- 4a) submit_review: review-submission lock ka gate.
--     HUBAHU 0010 wali body, sirf ek nayi shart shuru me: agar review_submission
--     OFF ho to DB khud rokti hai (README §55: browse/login chalta rahe, sirf
--     naya review na bane).
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

comment on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid) is
  'Naya review. Ab review_submission feature lock bhi yahin lagta hai (README §55), phir verified student, context, uniqueness, limit, answers.';

-- -----------------------------------------------------------------------------
-- 4b) update_my_review: review-editing lock ka gate.
--     HUBAHU 0011 wali body, sirf ek nayi shart: review_editing OFF ho to edit
--     nahi ho sakti (README §55).
-- -----------------------------------------------------------------------------
create or replace function public.update_my_review(
  p_review_id uuid,
  p_overall   smallint,
  p_comment   text,
  p_answers   jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_category  public.person_category;
  v_edits     smallint;
  v_max_edits int;
  v_old       text;
  v_comment   text;
  v_words     int;
  v_expected  int;
  v_inserted  int;
begin
  if v_uid is null or not public.is_verified_student() then
    raise exception 'Your account cannot edit reviews.' using errcode = 'insufficient_privilege';
  end if;

  -- FEATURE LOCK (README §55): review editing band ho to koi edit nahi.
  if not public.feature_enabled('review_editing') then
    raise exception 'Editing reviews is paused right now. Please try again later.'
      using errcode = 'check_violation';
  end if;

  select r.category, r.edit_count, r.comment
    into v_category, v_edits, v_old
    from public.reviews r
    join public.review_authors ra on ra.review_id = r.id
   where r.id = p_review_id
     and ra.author_id = v_uid
     and r.status = 'published';

  if not found then
    raise exception 'That review is not available to edit.' using errcode = 'no_data_found';
  end if;

  select max_edits into v_max_edits from public.review_limits();

  if v_edits >= v_max_edits then
    raise exception 'You have used all edits for this review.' using errcode = 'check_violation';
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

  update public.reviews r
     set overall_rating     = p_overall,
         comment            = v_comment,
         edit_count         = r.edit_count + 1,
         moderation_status  =
           case
             when v_comment is null then 'none'::public.review_moderation_status
             when v_comment is not distinct from v_old then r.moderation_status
             else 'pending'::public.review_moderation_status
           end,
         is_featured        =
           case
             when v_comment is not null and v_comment is not distinct from v_old
               then r.is_featured
             else false
           end,
         moderated_at       =
           case
             when v_comment is not null and v_comment is not distinct from v_old
               then r.moderated_at
             else null
           end,
         moderated_by       =
           case
             when v_comment is not null and v_comment is not distinct from v_old
               then r.moderated_by
             else null
           end
   where r.id = p_review_id;

  delete from public.review_answers where review_id = p_review_id;

  insert into public.review_answers (review_id, criterion_id, star_value, bool_value)
  select
    p_review_id,
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
    raise exception 'Please answer every question before saving.' using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.update_my_review(uuid, smallint, text, jsonb) is
  'Apni review edit karo. Ab review_editing feature lock bhi yahin lagta hai (README §55). Text badle to moderation dobara pending.';

-- -----------------------------------------------------------------------------
-- 4c) enforce_university_email: signup lock + domain lock.
--     HUBAHU purani body, do naye branch:
--       * student_signup OFF  -> naya account block (README §55).
--       * email_domain_lock OFF (UNLOCKED) -> domain restriction narm, magar
--         email phir bhi valid honi chahiye. Default LOCKED hai (fail-secure).
--     Yeh trigger auth.users par BEFORE INSERT hai; existing users ka login is se
--     na rukta hai (wo insert nahi, sirf naya signup insert karta hai).
-- -----------------------------------------------------------------------------
create or replace function public.enforce_university_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_domain text;
  v_ok     boolean;
begin
  -- SIGNUP LOCK (README §55): naya account banna band ho to yahin ruk jao.
  -- Mojood users ka login is raaste se nahi guzarta, is liye wo mutasir nahi.
  if not public.feature_enabled('student_signup') then
    raise exception 'New sign ups are closed right now.'
      using errcode = 'check_violation';
  end if;

  v_domain := lower(split_part(coalesce(new.email, ''), '@', 2));

  if v_domain = '' then
    raise exception 'A valid email address is required.'
      using errcode = 'check_violation';
  end if;

  -- DOMAIN LOCK (README §55). LOCKED (default) par sirf university domain.
  -- UNLOCKED par domain ki shart narm, magar email ka shakl phir bhi valid ho.
  if public.feature_enabled('email_domain_lock') then
    select exists (
      select 1
        from public.universities u
       where u.is_active
         and v_domain = any (u.email_domains)
    ) into v_ok;

    if not v_ok then
      raise exception 'This email address is not eligible for an account.'
        using errcode = 'check_violation';
    end if;
  end if;

  new.email := lower(new.email);
  return new;
end;
$$;

comment on function public.enforce_university_email() is
  'auth.users BEFORE INSERT. Ab student_signup + email_domain_lock switch bhi yahin lagte hain (README §55). Default: signup ON, domain LOCKED.';

-- -----------------------------------------------------------------------------
-- 5) Grants - STANDING RULE: pehle sab se chheeno, phir do.
-- -----------------------------------------------------------------------------
revoke all on function public.feature_enabled(text)                                 from public, anon, authenticated;
revoke all on function public.write_audit(text, text, uuid, jsonb)                  from public, anon, authenticated;
revoke all on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid) from public, anon, authenticated;
revoke all on function public.update_my_review(uuid, smallint, text, jsonb)          from public, anon, authenticated;
-- enforce_university_email trigger-only hai; kisi client role ko execute nahi.
revoke all on function public.enforce_university_email()                             from public, anon, authenticated;

-- feature_enabled public pages ko bhi chahiye ho sakti hai (misal: signup band
-- hone ka banner), is liye anon + authenticated dono.
grant execute on function public.feature_enabled(text)                    to anon, authenticated;
grant execute on function public.write_audit(text, text, uuid, jsonb)     to authenticated;
grant execute on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid) to authenticated;
grant execute on function public.update_my_review(uuid, smallint, text, jsonb)          to authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * Admin chaar cheezein server-side rok/khol sakta hai: signup, review submit,
--     review edit, email-domain lock. Faisla feature_enabled() (server time) me.
--   * submit_review / update_my_review DevTools se bhi bypass nahi hote: gate DB
--     me hai. enforce_university_email me signup + domain lock lagta hai.
--   * write_audit() se har admin action ka record banega (agli migrations use
--     karengi).
--   * Sab defaults mehfooz taraf: site abhi jaise chal rahi hai, domain LOCKED.
--   * Koi table/data drop nahi hua.
--
-- Owner (Windows) par apply ke baad tez tasdeeq:
--   select public.feature_enabled('student_signup');   -- true
--   -- ek switch band karke dekho (admin RPC agli migration me aayega):
--   update public.feature_flags set is_enabled = false where key = 'review_submission';
--   -- ab submit_review error dega; wapas true kar dena.
-- =============================================================================
