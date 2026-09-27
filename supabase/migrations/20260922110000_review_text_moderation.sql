-- =============================================================================
-- 20260922110000_review_text_moderation.sql
--
-- Phase 3 ka agla hissa: README §22 (text moderation), §23 (server-side
-- pagination), §24 (featured reviews).
--
-- ASAL SOOCH: rating aur likha hua text DO ALAG cheezein hain.
--
--   * Structured rating (overall + criteria) hamesha ginti hai. Usay kisi
--     approval ka intezar nahi karna parta.
--   * Likha hua text tab tak PUBLIC NAHI hota jab tak admin approve na kare.
--
-- Yeh farq DB me is tarah lagaya gaya hai ke browser se bypass ho hi na sake:
--
--   1) `reviews.comment` par se anon/authenticated ka COLUMN-LEVEL select
--      chheen liya gaya hai. Ab koi seedha PostgREST par ?select=comment nahi
--      maar sakta — chahe DevTools me kuch bhi karay. (README §70)
--   2) Text parhne ka waahid raasta `person_reviews()` function hai, jo comment
--      SIRF tab deta hai jab moderation_status = 'approved' ho.
--   3) Student apni khud ki text hamesha dekh sakta hai, magar sirf apni —
--      `my_reviews()` / `my_review_for_person()` ke zariye, jo auth.uid() khud
--      apne andar parhti hain.
--
-- SAFETY:
--   * Koi table drop nahi, koi review delete nahi, koi purani migration dobara
--     nahi chalti. Sab kuch guarded aur idempotent hai.
--   * Purani text reviews ko 'pending' par rakha ja raha hai (approve nahi),
--     kyunke unko kisi ne abhi tak parha hi nahi. Rating phir bhi ginti rahegi,
--     is liye kisi ka average nahi girta.
--   * `my_reviews()` ka return shape badla hai, is liye usay drop kar ke dobara
--     banana para. Uske grants neeche saaf saaf dobara diye gaye hain.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Moderation ki halat
--
--    'none' ka matlab: is review me koi text hai hi nahi, to moderate karne ko
--    kuch nahi. Yeh 'approved' se alag rakha gaya hai taake admin queue me
--    sirf wahi reviews aayein jin me waqai kuch likha hua hai.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'review_moderation_status') then
    create type public.review_moderation_status as enum
      ('none', 'pending', 'approved', 'rejected', 'hidden');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 2) reviews par naye columns
-- -----------------------------------------------------------------------------
alter table public.reviews
  add column if not exists moderation_status public.review_moderation_status not null default 'none';

alter table public.reviews
  add column if not exists is_featured boolean not null default false;

alter table public.reviews
  add column if not exists moderated_at timestamptz;

alter table public.reviews
  add column if not exists moderated_by uuid references public.profiles (id) on delete set null;

comment on column public.reviews.moderation_status is
  'Sirf likhe hue text ke liye. Text public tab hota hai jab yeh approved ho (README §22). Rating is se mutasir nahi hoti.';
comment on column public.reviews.is_featured is
  'Profile page par upar dikhne wali chuni hui reviews (README §24). Sirf approved text feature ho sakta hai.';
comment on column public.reviews.moderated_by is
  'Kis admin ne faisla kiya. Yeh review ke AUTHOR se koi taalluq nahi rakhta - author ka column is table me hai hi nahi.';

-- Purani text reviews: unko approve nahi karte, queue me daalte hain.
update public.reviews
   set moderation_status = 'pending'
 where comment is not null
   and moderation_status = 'none';

-- Ulta case (defensive): text hai hi nahi magar koi status laga hua hai.
update public.reviews
   set moderation_status = 'none',
       is_featured       = false
 where comment is null
   and moderation_status <> 'none';

-- -----------------------------------------------------------------------------
-- 3) Constraints — yeh do rule DB me pathar par likhe hain
-- -----------------------------------------------------------------------------
alter table public.reviews
  drop constraint if exists reviews_moderation_matches_comment;

alter table public.reviews
  add constraint reviews_moderation_matches_comment
  check (
    (comment is null and moderation_status = 'none')
    or (comment is not null and moderation_status <> 'none')
  );

alter table public.reviews
  drop constraint if exists reviews_featured_requires_approval;

alter table public.reviews
  add constraint reviews_featured_requires_approval
  check (is_featured = false or moderation_status = 'approved');

-- -----------------------------------------------------------------------------
-- 4) Indexes — profile page aur admin queue dono ke liye
-- -----------------------------------------------------------------------------
create index if not exists reviews_person_recent_idx
  on public.reviews (person_id, created_at desc)
  where status = 'published';

create index if not exists reviews_person_featured_idx
  on public.reviews (person_id, created_at desc)
  where status = 'published' and is_featured;

create index if not exists reviews_moderation_queue_idx
  on public.reviews (created_at)
  where moderation_status = 'pending';

-- -----------------------------------------------------------------------------
-- 5) admin_audit_log — README §22 "Moderation actions must be audit logged"
--
--    Is table me AUTHOR ka koi zikr nahi hota: sirf review ka id. Moderation
--    bina naam jane hoti hai, aur audit trail bhi bina naam ke rehta hai.
-- -----------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.admin_audit_log is
  'Admin ke faislon ka record. Koi insert grant nahi - sirf SECURITY DEFINER functions likhti hain.';

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_entity_idx
  on public.admin_audit_log (entity_type, entity_id);

alter table public.admin_audit_log enable row level security;

-- anon ko kuch nahi. Admin ko sirf parhne ka haq.
grant select on public.admin_audit_log to authenticated;

drop policy if exists "admin reads audit log" on public.admin_audit_log;
create policy "admin reads audit log"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6) COLUMN-LEVEL GRANT — `comment` ab seedha parha hi nahi ja sakta
--
--    Postgres me table-level SELECT har column ko cover karta hai, is liye
--    pehle poora select wapas lena parta hai, phir column list se dobara dena.
--    moderated_at / moderated_by bhi jaan boojh kar nahi diye: wo admin ka
--    internal record hain, public ko unki zaroorat nahi.
-- -----------------------------------------------------------------------------
revoke select on public.reviews from anon, authenticated;

grant select (
  id,
  person_id,
  category,
  overall_rating,
  status,
  edit_count,
  moderation_status,
  is_featured,
  created_at,
  updated_at
) on public.reviews to anon, authenticated;

-- =============================================================================
-- 7) Public read function — pagination + featured + moderated text
-- =============================================================================
-- SECURITY DEFINER hai, is liye RLS yahan nahi lagti. Wohi shart jo RLS policy
-- me hai, yahan HAATH SE dobara lagai gai hai: sirf published review, aur sirf
-- active banday ki. Ise kabhi hataana nahi.
create or replace function public.person_reviews(
  p_person_id     uuid,
  p_limit         int     default 10,
  p_offset        int     default 0,
  p_featured_only boolean default false,
  p_oldest_first  boolean default false
)
returns table (
  review_id      uuid,
  overall_rating smallint,
  comment        text,
  is_featured    boolean,
  was_edited     boolean,
  created_at     timestamptz,
  updated_at     timestamptz,
  answers        jsonb,
  total_count    bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.id,
    r.overall_rating,
    -- YAHI woh jagah hai jahan §22 lagta hai: bina approval ke text null hai.
    case when r.moderation_status = 'approved' then r.comment end,
    r.is_featured,
    r.edit_count > 0,
    r.created_at,
    r.updated_at,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'key',   c.key,
            'label', c.label,
            'kind',  c.kind,
            'star',  a.star_value,
            'yes',   a.bool_value
          )
          order by c.sort_order
        ),
        '[]'::jsonb
      )
      from public.review_answers a
      join public.review_criteria c on c.id = a.criterion_id
      where a.review_id = r.id
    ),
    -- Window function LIMIT se pehle chalta hai, is liye yeh poora total deta hai.
    count(*) over ()
  from public.reviews r
  join public.people p on p.id = r.person_id and p.is_active
  where r.person_id = p_person_id
    and r.status = 'published'
    and (not p_featured_only or r.is_featured)
  order by
    case when p_oldest_first then r.created_at end asc,
    case when p_oldest_first then null else r.created_at end desc,
    r.id
  -- Client jo bhi bheje, page ki lambai yahan band hai. README §23: kabhi
  -- saari reviews ek saath browser me mat bhejo.
  limit  least(greatest(coalesce(p_limit, 10), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

comment on function public.person_reviews(uuid, int, int, boolean, boolean) is
  'Public review list. Text sirf approved hone par milta hai, page ki had 50 hai, total_count pagination ke liye.';

-- =============================================================================
-- 8) Student ko apni review (text apni hamesha dikhti hai)
-- =============================================================================
create or replace function public.my_review_for_person(p_person_id uuid)
returns table (
  review_id         uuid,
  person_id         uuid,
  person_slug       text,
  person_name       text,
  category          public.person_category,
  overall_rating    smallint,
  comment           text,
  status            public.review_status,
  moderation_status public.review_moderation_status,
  edit_count        smallint,
  edits_left        int,
  created_at        timestamptz,
  updated_at        timestamptz,
  answers           jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.id,
    r.person_id,
    p.slug,
    coalesce(p.display_name, p.full_name),
    r.category,
    r.overall_rating,
    r.comment,
    r.status,
    r.moderation_status,
    r.edit_count,
    greatest((select max_edits from public.review_limits()) - r.edit_count, 0),
    r.created_at,
    r.updated_at,
    (
      select coalesce(
        jsonb_object_agg(
          c.key,
          jsonb_build_object('star', a.star_value, 'yes', a.bool_value)
        ),
        '{}'::jsonb
      )
      from public.review_answers a
      join public.review_criteria c on c.id = a.criterion_id
      where a.review_id = r.id
    )
  from public.review_authors ra
  join public.reviews r on r.id = ra.review_id
  join public.people  p on p.id = r.person_id
  where ra.author_id = auth.uid()
    and ra.person_id = p_person_id
    and r.status <> 'removed';
$$;

comment on function public.my_review_for_person(uuid) is
  'Sirf apni review (edit form pre-fill ke liye). auth.uid() function ke andar parha jata hai, client se nahi aata.';

-- my_reviews() ka shape badal raha hai (moderation_status add ho raha hai), aur
-- OUT columns `create or replace` se nahi badalte. Is liye drop kar ke dobara.
-- Table ka koi data is se nahi jata — yeh sirf ek read function hai.
drop function if exists public.my_reviews();

create function public.my_reviews()
returns table (
  review_id         uuid,
  person_id         uuid,
  person_slug       text,
  person_name       text,
  category          public.person_category,
  overall_rating    smallint,
  comment           text,
  status            public.review_status,
  moderation_status public.review_moderation_status,
  edit_count        smallint,
  edits_left        int,
  created_at        timestamptz,
  updated_at        timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.id,
    r.person_id,
    p.slug,
    coalesce(p.display_name, p.full_name),
    r.category,
    r.overall_rating,
    r.comment,
    r.status,
    r.moderation_status,
    r.edit_count,
    greatest((select max_edits from public.review_limits()) - r.edit_count, 0),
    r.created_at,
    r.updated_at
  from public.review_authors ra
  join public.reviews r on r.id = ra.review_id
  join public.people  p on p.id = r.person_id
  where ra.author_id = auth.uid()
    and r.status <> 'removed'
  order by r.created_at desc;
$$;

comment on function public.my_reviews() is
  'Sirf current user ki apni reviews, moderation ki halat ke saath.';

-- =============================================================================
-- 9) Write functions ko moderation ke mutabiq update karo
-- =============================================================================
-- submit_review: text hai to 'pending', warna 'none'.
create or replace function public.submit_review(
  p_person_id uuid,
  p_overall   smallint,
  p_comment   text,
  p_answers   jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_category   public.person_category;
  v_comment    text;
  v_words      int;
  v_review_id  uuid;
  v_expected   int;
  v_inserted   int;
  v_today      int;
  v_max_day    int;
begin
  if v_uid is null then
    raise exception 'You must be signed in to post a review.' using errcode = 'insufficient_privilege';
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

  if exists (
    select 1 from public.review_authors ra
     where ra.author_id = v_uid and ra.person_id = p_person_id
  ) then
    raise exception 'You have already reviewed this person.' using errcode = 'unique_violation';
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

  -- README §22: text aaya hai to seedha queue me. Rating phir bhi foran ginti hai.
  insert into public.reviews (person_id, category, overall_rating, comment, moderation_status)
  values (
    p_person_id,
    v_category,
    p_overall,
    v_comment,
    case when v_comment is null then 'none' else 'pending' end
  )
  returning id into v_review_id;

  insert into public.review_authors (review_id, author_id, person_id)
  values (v_review_id, v_uid, p_person_id);

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

comment on function public.submit_review(uuid, smallint, text, jsonb) is
  'Naya review. Verified student, ek banday par ek review, daily limit, overall 1-10, 150 word limit. Text aaye to moderation queue me jata hai.';

-- update_my_review: agar text BADLA hai to wo dobara pending hota hai.
-- Warna approve karwa kar text badal dena ek aasan hamla hota.
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
             -- Text waisa hi hai to purana faisla qayam rehta hai.
             when v_comment is not distinct from v_old then r.moderation_status
             -- Text badal gaya: naya text, naya faisla.
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
  'Apni review edit karo. Text badalne par moderation dobara pending ho jati hai aur feature hat jata hai.';

-- =============================================================================
-- 10) Admin moderation (README §22, §24)
-- =============================================================================
-- Queue: sirf wo reviews jin me text hai. Author ka koi zikr nahi — admin ko
-- pata hi nahi chalta ke kis ne likha, aur yehi maqsad hai.
create or replace function public.admin_review_queue(
  p_status public.review_moderation_status default 'pending',
  p_limit  int default 20,
  p_offset int default 0
)
returns table (
  review_id      uuid,
  person_id      uuid,
  person_slug    text,
  person_name    text,
  category       public.person_category,
  overall_rating smallint,
  comment        text,
  is_featured    boolean,
  created_at     timestamptz,
  total_count    bigint
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
      r.id,
      r.person_id,
      p.slug,
      coalesce(p.display_name, p.full_name),
      r.category,
      r.overall_rating,
      r.comment,
      r.is_featured,
      r.created_at,
      count(*) over ()
    from public.reviews r
    join public.people p on p.id = r.person_id
    where r.moderation_status = p_status
      and r.status <> 'removed'
    order by r.created_at asc, r.id
    limit  least(greatest(coalesce(p_limit, 20), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

comment on function public.admin_review_queue(public.review_moderation_status, int, int) is
  'Admin ka moderation queue. Author ka naam yahan bhi nahi aata - moderation anonymous rehti hai.';

-- Ek hi darwaza har moderation action ke liye, taake audit log kabhi na chhoote.
create or replace function public.moderate_review(
  p_review_id uuid,
  p_action    text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_status public.review_moderation_status;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  select r.moderation_status into v_status
    from public.reviews r
   where r.id = p_review_id
     and r.comment is not null;

  if not found then
    raise exception 'That review is not available to moderate.' using errcode = 'no_data_found';
  end if;

  if p_action = 'approve' then
    update public.reviews
       set moderation_status = 'approved',
           moderated_at      = now(),
           moderated_by      = v_uid
     where id = p_review_id;

  elsif p_action = 'reject' then
    update public.reviews
       set moderation_status = 'rejected',
           is_featured       = false,
           moderated_at      = now(),
           moderated_by      = v_uid
     where id = p_review_id;

  elsif p_action = 'hide' then
    update public.reviews
       set moderation_status = 'hidden',
           is_featured       = false,
           moderated_at      = now(),
           moderated_by      = v_uid
     where id = p_review_id;

  elsif p_action = 'feature' then
    -- Sirf approved text feature ho sakta hai (constraint bhi yehi kehti hai,
    -- magar yahan message behtar milta hai).
    if v_status <> 'approved' then
      raise exception 'Approve this review before featuring it.' using errcode = 'check_violation';
    end if;
    update public.reviews
       set is_featured  = true,
           moderated_at = now(),
           moderated_by = v_uid
     where id = p_review_id;

  elsif p_action = 'unfeature' then
    update public.reviews
       set is_featured  = false,
           moderated_at = now(),
           moderated_by = v_uid
     where id = p_review_id;

  else
    raise exception 'That action is not allowed.' using errcode = 'check_violation';
  end if;

  -- Audit log. Sirf review ka id jata hai, likhne wale ka koi zikr nahi.
  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    'review.' || p_action,
    'review',
    p_review_id,
    jsonb_build_object('from', v_status)
  );
end;
$$;

comment on function public.moderate_review(uuid, text) is
  'Approve / reject / hide / feature / unfeature. Har action audit log me jata hai (README §22).';

-- -----------------------------------------------------------------------------
-- 11) Grants — STANDING RULE: har function se public/anon ka execute chheeno,
--     phir sirf zaroori role ko wapas do.
-- -----------------------------------------------------------------------------
revoke all on function public.person_reviews(uuid, int, int, boolean, boolean)        from public, anon, authenticated;
revoke all on function public.my_review_for_person(uuid)                              from public, anon, authenticated;
revoke all on function public.my_reviews()                                            from public, anon, authenticated;
revoke all on function public.submit_review(uuid, smallint, text, jsonb)              from public, anon, authenticated;
revoke all on function public.update_my_review(uuid, smallint, text, jsonb)           from public, anon, authenticated;
revoke all on function public.admin_review_queue(public.review_moderation_status, int, int) from public, anon, authenticated;
revoke all on function public.moderate_review(uuid, text)                             from public, anon, authenticated;

-- person_reviews public list hai, is liye anon ko bhi chahiye.
grant execute on function public.person_reviews(uuid, int, int, boolean, boolean)     to anon, authenticated;
grant execute on function public.my_review_for_person(uuid)                           to authenticated;
grant execute on function public.my_reviews()                                         to authenticated;
grant execute on function public.submit_review(uuid, smallint, text, jsonb)           to authenticated;
grant execute on function public.update_my_review(uuid, smallint, text, jsonb)        to authenticated;
-- Yeh do sirf logged-in users ko milti hain; andar phir bhi is_admin() ka taala hai.
grant execute on function public.admin_review_queue(public.review_moderation_status, int, int) to authenticated;
grant execute on function public.moderate_review(uuid, text)                          to authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * Likha hua text tab tak public nahi jab tak admin approve na kare.
--   * `reviews.comment` par anon/authenticated ka column-level select hai hi
--     nahi, is liye DevTools se seedha PostgREST par bhi text nahi milta.
--   * Rating aur criteria ke average moderation se bilkul mutasir nahi hote.
--   * Profile page ab server-side pagination karta hai (page max 50).
--   * Featured sirf approved text par lag sakta hai; text badla to feature khud
--     hat jata hai aur review dobara queue me chali jati hai.
--   * Har moderation action admin_audit_log me likha jata hai, bina author ke.
-- =============================================================================
