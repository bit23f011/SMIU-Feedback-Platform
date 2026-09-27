-- =============================================================================
-- ProfAura — Migration 0006: Reviews core (Phase 3)
-- -----------------------------------------------------------------------------
-- Yeh phase platform ka DIL hai: students structured reviews likhte hain
-- (stars + yes/no), aur wo reviews public par ANONYMOUS dikhti hain.
--
-- SAB SE AHEM DESIGN FAISLA — anonymity ko "policy" nahi, "structure" banaya hai:
--
--   `public.reviews` table me author ka koi column HAI HI NAHI.
--   Author ka rishta alag private table `public.review_authors` me hai.
--
-- Iska matlab: public review row me leak karne ke liye kuch mojood hi nahi.
-- Agar kal koi galti se RLS policy dheeli kar de, tab bhi `reviews` se kisi ka
-- naam nahi nikal sakta — kyunki wahan naam rakha hi nahi gaya.
-- `review_authors` par RLS sirf "apni row" deti hai, aur anon ko koi grant nahi.
--
-- DOOSRA FAISLA — clients ke paas KOI write grant nahi.
-- insert/update/delete sab SECURITY DEFINER functions se hota hai
-- (submit_review / update_my_review / delete_my_review). Har rule — verified
-- student hona, ek banday par ek hi review, edit limit, rate limit, comment ki
-- lambai — DB ke andar lagta hai. Frontend sirf wahi rule dobara dikhata hai.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Enums
-- -----------------------------------------------------------------------------

-- Review ki halat. 'removed' soft-delete hai (neeche wajah likhi hai).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type public.review_status as enum ('published', 'hidden', 'removed');
  end if;
end
$$;

-- Har criterion ya to 1-5 star hai ya haan/nahi.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'review_criterion_kind') then
    create type public.review_criterion_kind as enum ('star', 'yes_no');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 2) review_criteria — kis category me kya poochha jata hai (reference data)
-- -----------------------------------------------------------------------------
-- Sawal DB me hain, code me hardcode NAHI. Is se do faide: (a) admin aage se
-- sawal badal sakta hai bina deploy ke, (b) har answer ek asli criterion row se
-- juda hota hai, is liye purane reviews ka matlab waqt ke saath nahi badalta.
create table if not exists public.review_criteria (
  id          uuid primary key default gen_random_uuid(),
  category    public.person_category not null,
  key         text not null check (key ~ '^[a-z0-9_]+$'),
  label       text not null,
  help_text   text,
  kind        public.review_criterion_kind not null,
  sort_order  smallint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (category, key)
);

comment on table public.review_criteria is
  'Har category ke review sawal. Answers isi se attach hote hain.';

-- -----------------------------------------------------------------------------
-- 3) reviews — public review row. YAHAN AUTHOR KA KOI COLUMN NAHI.
-- -----------------------------------------------------------------------------
create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.people (id) on delete cascade,
  -- Category review likhte waqt "freeze" ho jati hai. Agar banda baad me role
  -- badle to purani review apne asli context me hi parhi jaye.
  category       public.person_category not null,
  overall_rating smallint not null check (overall_rating between 1 and 5),
  comment        text
                 check (
                   comment is null
                   or char_length(btrim(comment)) between 20 and 2000
                 ),
  status         public.review_status not null default 'published',
  edit_count     smallint not null default 0 check (edit_count >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.reviews is
  'Public review. Jaan boojh kar author column NAHI hai - anonymity structure se aati hai, policy se nahi.';

-- -----------------------------------------------------------------------------
-- 4) review_authors — private mapping (kis ne kis ko review kiya)
-- -----------------------------------------------------------------------------
-- anon ko is table par kuch nahi milta. authenticated ko sirf apni rows.
-- unique (author_id, person_id) = EK BANDAY PAR EK HI REVIEW.
create table if not exists public.review_authors (
  review_id   uuid primary key references public.reviews (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  -- person_id yahan bhi rakha hai sirf is liye ke "ek banday par ek review" wala
  -- unique index yahin lag sake. Isay sirf submit_review bharta hai.
  person_id   uuid not null references public.people (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (author_id, person_id)
);

comment on table public.review_authors is
  'PRIVATE. Review aur uske likhne wale ka rishta. anon ko koi grant nahi; student sirf apni rows dekhta hai.';

-- -----------------------------------------------------------------------------
-- 5) review_answers — har criterion ka jawab
-- -----------------------------------------------------------------------------
create table if not exists public.review_answers (
  review_id    uuid not null references public.reviews (id) on delete cascade,
  criterion_id uuid not null references public.review_criteria (id) on delete restrict,
  star_value   smallint check (star_value between 1 and 5),
  bool_value   boolean,
  primary key (review_id, criterion_id),
  -- Do me se theek EK bhara ho.
  check (num_nonnulls(star_value, bool_value) = 1)
);

comment on table public.review_answers is
  'Ek review ke structured jawab. star_value YA bool_value - dono nahi, koi nahi bhi nahi.';

-- -----------------------------------------------------------------------------
-- 6) Indexes
-- -----------------------------------------------------------------------------
create index if not exists reviews_person_id_idx
  on public.reviews (person_id)
  where status = 'published';

create index if not exists reviews_created_at_idx
  on public.reviews (created_at desc);

create index if not exists review_authors_author_id_idx
  on public.review_authors (author_id);

create index if not exists review_answers_criterion_idx
  on public.review_answers (criterion_id);

create index if not exists review_criteria_category_idx
  on public.review_criteria (category)
  where is_active;

-- updated_at auto (Phase 1 ka shared trigger function).
drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7) Aggregate views
-- -----------------------------------------------------------------------------
-- `security_invoker = on` bohot zaroori hai: view bulane wale ki RLS lagti hai,
-- view owner ki nahi. Warna view ek chupa hua SECURITY DEFINER ban jata.

-- Har person ka overall summary.
create or replace view public.person_rating_stats
with (security_invoker = on) as
  select
    r.person_id,
    count(*)::int                                          as review_count,
    round(avg(r.overall_rating)::numeric, 2)               as average_rating,
    count(*) filter (where r.overall_rating = 5)::int      as count_5,
    count(*) filter (where r.overall_rating = 4)::int      as count_4,
    count(*) filter (where r.overall_rating = 3)::int      as count_3,
    count(*) filter (where r.overall_rating = 2)::int      as count_2,
    count(*) filter (where r.overall_rating = 1)::int      as count_1
  from public.reviews r
  where r.status = 'published'
  group by r.person_id;

comment on view public.person_rating_stats is
  'Published reviews ka per-person summary. security_invoker=on - caller ki RLS lagti hai.';

-- Har person ka per-criterion summary (stars ka average, yes/no ka percentage).
create or replace view public.person_criteria_stats
with (security_invoker = on) as
  select
    r.person_id,
    c.id                                                   as criterion_id,
    c.category,
    c.key,
    c.label,
    c.kind,
    c.sort_order,
    round(avg(a.star_value)::numeric, 2)                   as average_star,
    count(a.star_value)::int                               as star_responses,
    count(*) filter (where a.bool_value)::int              as yes_count,
    count(a.bool_value)::int                               as bool_responses
  from public.reviews r
  join public.review_answers a  on a.review_id = r.id
  join public.review_criteria c on c.id = a.criterion_id
  where r.status = 'published'
  group by r.person_id, c.id, c.category, c.key, c.label, c.kind, c.sort_order;

comment on view public.person_criteria_stats is
  'Published reviews ka per-criterion summary. security_invoker=on.';

-- =============================================================================
-- 8) Write functions — clients ka SIRF yehi raasta hai
-- =============================================================================
-- Kisi bhi table par insert/update/delete ka grant NAHI diya gaya. Har write
-- in functions se hoti hai, aur har rule yahin check hota hai.

-- Ek banda 24 ghante me kitni reviews likh sakta hai (spam brake).
-- Aur ek review kitni baar edit ho sakti hai.
create or replace function public.review_limits()
returns table (max_per_day int, max_edits int)
language sql
immutable
as $$
  select 10, 2;
$$;

comment on function public.review_limits() is
  'Ek hi jagah limits, taake function aur UI dono ek hi number parhein.';

-- -----------------------------------------------------------------------------
-- 8a) submit_review
-- -----------------------------------------------------------------------------
-- p_answers ki shakal:  [{"key":"teaching_clarity","star":4},
--                        {"key":"would_recommend","yes":true}, ...]
-- Us category ke SAARE active criteria ka jawab lazmi hai.
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
  v_review_id  uuid;
  v_expected   int;
  v_inserted   int;
  v_today      int;
  v_max_day    int;
begin
  if v_uid is null then
    raise exception 'You must be signed in to post a review.' using errcode = 'insufficient_privilege';
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

  -- EK BANDAY PAR EK REVIEW. (unique index bhi hai; yeh sirf behtar message ke liye.)
  if exists (
    select 1 from public.review_authors ra
     where ra.author_id = v_uid and ra.person_id = p_person_id
  ) then
    raise exception 'You have already reviewed this person.' using errcode = 'unique_violation';
  end if;

  -- Rate limit: ek din me itni se zyada nahi.
  select max_per_day into v_max_day from public.review_limits();

  select count(*)::int into v_today
    from public.review_authors ra
   where ra.author_id = v_uid
     and ra.created_at > now() - interval '24 hours';

  if v_today >= v_max_day then
    raise exception 'You have reached the daily limit for new reviews.' using errcode = 'check_violation';
  end if;

  if p_overall is null or p_overall < 1 or p_overall > 5 then
    raise exception 'Give an overall rating between 1 and 5.' using errcode = 'check_violation';
  end if;

  v_comment := nullif(btrim(coalesce(p_comment, '')), '');

  insert into public.reviews (person_id, category, overall_rating, comment)
  values (p_person_id, v_category, p_overall, v_comment)
  returning id into v_review_id;

  insert into public.review_authors (review_id, author_id, person_id)
  values (v_review_id, v_uid, p_person_id);

  -- Answers: sirf wahi keys chalengi jo is category ke active criteria me hain,
  -- aur kind ke mutabiq theek field bhari ho.
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
  'Naya review. Verified student, ek banday par ek review, daily limit, poore answers - sab yahin check hote hain.';

-- -----------------------------------------------------------------------------
-- 8b) update_my_review
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
  v_comment   text;
  v_expected  int;
  v_inserted  int;
begin
  if v_uid is null or not public.is_verified_student() then
    raise exception 'Your account cannot edit reviews.' using errcode = 'insufficient_privilege';
  end if;

  -- Ownership review_authors se aati hai — reviews table me author hai hi nahi.
  select r.category, r.edit_count into v_category, v_edits
    from public.reviews r
    join public.review_authors ra on ra.review_id = r.id
   where r.id = p_review_id
     and ra.author_id = v_uid
     and r.status = 'published';

  if not found then
    -- Jaan boojh kar ek hi message: "nahi milA" aur "tumhara nahi hai" me farq
    -- na bataayein, warna doosron ke review ids probe kiye ja sakte hain.
    raise exception 'That review is not available to edit.' using errcode = 'no_data_found';
  end if;

  select max_edits into v_max_edits from public.review_limits();

  if v_edits >= v_max_edits then
    raise exception 'You have used all edits for this review.' using errcode = 'check_violation';
  end if;

  if p_overall is null or p_overall < 1 or p_overall > 5 then
    raise exception 'Give an overall rating between 1 and 5.' using errcode = 'check_violation';
  end if;

  v_comment := nullif(btrim(coalesce(p_comment, '')), '');

  update public.reviews
     set overall_rating = p_overall,
         comment        = v_comment,
         edit_count     = edit_count + 1
   where id = p_review_id;

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
  'Apni review edit karo. Edit limit review_limits() se aati hai.';

-- -----------------------------------------------------------------------------
-- 8c) delete_my_review — SOFT delete
-- -----------------------------------------------------------------------------
-- Row poori tarah delete karne se review_authors ki unique row bhi chali jati aur
-- banda naya review likh kar edit-limit ka pura system bypass kar leta. Is liye
-- status = 'removed' hota hai aur mapping qayam rehti hai. UI me saaf likha hai
-- ke delete permanent hai.
create or replace function public.delete_my_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_verified_student() then
    raise exception 'Your account cannot delete reviews.' using errcode = 'insufficient_privilege';
  end if;

  update public.reviews r
     set status = 'removed'
   where r.id = p_review_id
     and r.status = 'published'
     and exists (
       select 1 from public.review_authors ra
        where ra.review_id = r.id and ra.author_id = v_uid
     );

  if not found then
    raise exception 'That review is not available to delete.' using errcode = 'no_data_found';
  end if;
end;
$$;

comment on function public.delete_my_review(uuid) is
  'Apni review hatao (soft delete). Mapping rehti hai taake dobara review kar ke limits bypass na hon.';

-- -----------------------------------------------------------------------------
-- 8d) my_reviews — student ko apni reviews dikhane ka safe raasta
-- -----------------------------------------------------------------------------
create or replace function public.my_reviews()
returns table (
  review_id      uuid,
  person_id      uuid,
  person_slug    text,
  person_name    text,
  category       public.person_category,
  overall_rating smallint,
  comment        text,
  status         public.review_status,
  edit_count     smallint,
  edits_left     int,
  created_at     timestamptz,
  updated_at     timestamptz
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
  'Sirf current user ki apni reviews. auth.uid() function ke andar lagta hai, client se nahi aata.';

-- -----------------------------------------------------------------------------
-- 8e) my_review_person_ids — "main ne kis kis ko review kiya"
-- -----------------------------------------------------------------------------
-- Directory/profile page isay use karta hai taake "Write a review" ki jagah
-- "Edit your review" dikhaye. Sirf apna data.
create or replace function public.my_reviewed_person_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select ra.person_id
    from public.review_authors ra
   where ra.author_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- 9) Grants — STANDING RULE: har nayi function se public/anon ka execute chheeno
-- -----------------------------------------------------------------------------
revoke all on function public.review_limits()                             from public, anon;
revoke all on function public.submit_review(uuid, smallint, text, jsonb)  from public, anon, authenticated;
revoke all on function public.update_my_review(uuid, smallint, text, jsonb) from public, anon, authenticated;
revoke all on function public.delete_my_review(uuid)                      from public, anon, authenticated;
revoke all on function public.my_reviews()                                from public, anon, authenticated;
revoke all on function public.my_reviewed_person_ids()                    from public, anon, authenticated;

-- Sirf logged-in users. (Andar phir bhi is_verified_student() check hota hai —
-- grant sirf pehla darwaza hai, taala andar hai.)
grant execute on function public.review_limits()                             to anon, authenticated;
grant execute on function public.submit_review(uuid, smallint, text, jsonb)  to authenticated;
grant execute on function public.update_my_review(uuid, smallint, text, jsonb) to authenticated;
grant execute on function public.delete_my_review(uuid)                      to authenticated;
grant execute on function public.my_reviews()                                to authenticated;
grant execute on function public.my_reviewed_person_ids()                    to authenticated;

-- -----------------------------------------------------------------------------
-- 10) RLS + table grants
-- -----------------------------------------------------------------------------
alter table public.review_criteria enable row level security;
alter table public.reviews         enable row level security;
alter table public.review_authors  enable row level security;
alter table public.review_answers  enable row level security;

-- SIRF select. Koi insert/update/delete grant nahi — functions hi waahid raasta hain.
grant select on public.review_criteria to anon, authenticated;
grant select on public.reviews         to anon, authenticated;
grant select on public.review_answers  to anon, authenticated;

-- review_authors: anon ko kuch nahi. authenticated ko select, magar RLS sirf
-- apni rows deti hai.
grant select on public.review_authors  to authenticated;

-- Views ko bhi apna grant chahiye.
grant select on public.person_rating_stats   to anon, authenticated;
grant select on public.person_criteria_stats to anon, authenticated;

-- review_criteria — sawal public hain (form banane ke liye chahiye).
drop policy if exists "public read active criteria" on public.review_criteria;
create policy "public read active criteria"
  on public.review_criteria for select
  to anon, authenticated
  using (is_active);

-- reviews — sirf published, aur sirf active banday ki.
drop policy if exists "public read published reviews" on public.reviews;
create policy "public read published reviews"
  on public.reviews for select
  to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.people p
      where p.id = person_id and p.is_active
    )
  );

-- Admin ko sab dikhti hain (Phase 5 moderation ke liye).
drop policy if exists "admin reads all reviews" on public.reviews;
create policy "admin reads all reviews"
  on public.reviews for select
  to authenticated
  using (public.is_admin());

-- review_answers — sirf un reviews ke jo public readable hain.
drop policy if exists "public read answers of published reviews" on public.review_answers;
create policy "public read answers of published reviews"
  on public.review_answers for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id and r.status = 'published'
    )
  );

-- review_authors — SIRF apni row. Koi doosra mapping kabhi nahi.
drop policy if exists "read own authorship" on public.review_authors;
create policy "read own authorship"
  on public.review_authors for select
  to authenticated
  using (author_id = auth.uid());

-- NOTE: admin ke liye review_authors par JAAN BOOJH KAR koi policy nahi hai.
-- Moderation bina asli naam jane honi chahiye. Agar kabhi abuse ke case me
-- identity chahiye hui, wo alag, audited, service-role wala raasta hoga.

-- -----------------------------------------------------------------------------
-- 11) Seed: har category ke sawal
-- -----------------------------------------------------------------------------
-- Yeh asli sawal hain, koi demo data nahi. Har category me 4 star + 2 yes/no.
insert into public.review_criteria (category, key, label, help_text, kind, sort_order) values
  -- teacher
  ('teacher', 'teaching_clarity',    'Teaching clarity',       'Kya concepts samajh aate hain?',                'star',   1),
  ('teacher', 'subject_knowledge',   'Subject knowledge',      'Apne subject par kitni giraft hai?',            'star',   2),
  ('teacher', 'grading_fairness',    'Fair grading',           'Marks mehnat ke hisab se milte hain?',          'star',   3),
  ('teacher', 'approachability',     'Approachable',           'Sawal poochhna kitna aasan hai?',               'star',   4),
  ('teacher', 'on_time',             'Starts and ends on time', null,                                           'yes_no', 5),
  ('teacher', 'would_recommend',     'Would recommend',        'Doosre students ko yeh class lene ka mashwara dogay?', 'yes_no', 6),

  -- lab_instructor
  ('lab_instructor', 'lab_guidance',      'Lab guidance',        'Practical steps kitni achhi tarah samjhate hain?', 'star',   1),
  ('lab_instructor', 'equipment_support', 'Equipment support',   'Machines/tools par madad milti hai?',              'star',   2),
  ('lab_instructor', 'safety_awareness',  'Safety awareness',    'Lab safety par kitna dhyan dete hain?',            'star',   3),
  ('lab_instructor', 'approachability',   'Approachable',        'Sawal poochhna kitna aasan hai?',                  'star',   4),
  ('lab_instructor', 'present_in_lab',    'Present through the lab', null,                                           'yes_no', 5),
  ('lab_instructor', 'would_recommend',   'Would recommend',     null,                                                'yes_no', 6),

  -- faculty
  ('faculty', 'academic_support', 'Academic support',   'Padhai me rehnumai milti hai?',           'star',   1),
  ('faculty', 'responsiveness',   'Responsiveness',     'Jawab kitni jaldi milta hai?',            'star',   2),
  ('faculty', 'fairness',         'Fairness',           'Sab students ke saath barabar suluk?',    'star',   3),
  ('faculty', 'professionalism',  'Professionalism',    null,                                       'star',   4),
  ('faculty', 'available_hours',  'Available in office hours', null,                                'yes_no', 5),
  ('faculty', 'would_recommend',  'Would recommend',    null,                                       'yes_no', 6),

  -- university_staff
  ('university_staff', 'helpfulness',      'Helpfulness',           'Kaam karwane me madad karte hain?',      'star',   1),
  ('university_staff', 'response_time',    'Response time',         'Kitni jaldi kaam hota hai?',             'star',   2),
  ('university_staff', 'clear_information','Clear information',     'Batai hui baat saaf hoti hai?',          'star',   3),
  ('university_staff', 'professionalism',  'Professionalism',       null,                                      'star',   4),
  ('university_staff', 'issue_resolved',   'Resolved my issue',     null,                                      'yes_no', 5),
  ('university_staff', 'would_recommend',  'Would recommend',       null,                                      'yes_no', 6),

  -- hr_staff
  ('hr_staff', 'helpfulness',     'Helpfulness',        null,                                        'star',   1),
  ('hr_staff', 'response_time',   'Response time',      null,                                        'star',   2),
  ('hr_staff', 'process_clarity', 'Clear process',      'Kya karna hai, yeh saaf batate hain?',      'star',   3),
  ('hr_staff', 'professionalism', 'Professionalism',    null,                                        'star',   4),
  ('hr_staff', 'kept_confidential','Kept things confidential', null,                                 'yes_no', 5),
  ('hr_staff', 'would_recommend', 'Would recommend',    null,                                        'yes_no', 6)
on conflict (category, key) do nothing;

-- =============================================================================
-- Phase 3 ke baad ki haalat:
--
-- * Koi bhi client role kisi review table par LIKH nahi sakta — sirf 4 functions.
-- * `reviews` me author ka column mojood hi nahi, is liye public row se identity
--   leak karne ke liye kuch hai hi nahi.
-- * `review_authors` anon ke liye poori tarah band hai, student ke liye sirf apni
--   rows, aur admin ke liye bhi koi policy nahi (moderation anonymous rehti hai).
-- * Ek banda = ek review (unique index), edit limit 2, daily limit 10.
-- * Delete soft hai taake limits bypass na hon.
-- =============================================================================
