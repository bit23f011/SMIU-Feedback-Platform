-- =============================================================================
-- ProfAura Phase 4 (B) - Aggregates, rankings, most reviewed, trending
-- README §37, §38, §39, §40, §41, §42, §84, §121
-- =============================================================================
-- MAQSAD:
--   §38 course-wise ratings, §39 semester-wise ratings (privacy threshold ke
--   saath), §40 rankings (default 5 verified reviews, admin badal sakta hai,
--   logic deterministic aur transparent), §41 Most Reviewed, §42 Trending
--   (anti-abuse ke saath). Teeno cheezein ALAG concepts hain (§40 ka aakhri jumla).
--
-- ASOOL:
--   1. THRESHOLDS DB me rehte hain, code me hard-code nahi. Admin unhe badal
--      sakta hai (§40) magar sirf ek SECURITY DEFINER function ke zariye jo
--      is_admin() check karti hai aur audit log likhti hai.
--   2. Yeh sab read functions SECURITY INVOKER hain. Matlab RLS caller par
--      lagti hai. Kisi jagah RLS bypass nahi hoti, is liye "published review of
--      an active person" ka rule dobara likhne ki zaroorat nahi parti (phir bhi
--      saaf rakhne ke liye status = 'published' saaf likha hua hai).
--   3. PRIVACY: course/semester breakdown chhote buckets par chhup jata hai.
--      Wajah Phase 3 wali hi hai: ek section me ek review = wo review anonymous
--      nahi rehti. Overall rating par is se koi asar nahi parta.
--   4. Koi randomness, koi hand-picking, koi "promoted" slot nahi. Ek hi data
--      par function hamesha wahi tarteeb deti hai.
--
-- DATA SAFETY (§27):
--   Additive. Ek nayi settings table (single row), naye read functions, aur ek
--   admin setter. Koi maujooda table, column, policy ya grant nahi chhira gaya.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) platform_settings - ek row, saare thresholds
-- -----------------------------------------------------------------------------
/*
  Ek hi row (id = 1) ka check constraint jaan boojh kar lagaya hai: settings do
  jagah nahi ho sakti, warna "kaunsi row asli hai" ka sawal paida hota hai.

  Yeh values secret NAHI hain. §40 kehta hai ranking logic transparent hona
  chahiye, aur §121 kehta hai UI par ise chhote se batao. Is liye public read
  hai, magar sirf numbers par: updated_by (kis admin ne badla) public nahi.
*/
create table if not exists public.platform_settings (
  id                    smallint primary key default 1 check (id = 1),
  -- §40: "Default ranking eligibility threshold: 5 verified reviews"
  ranking_min_reviews   smallint not null default 5  check (ranking_min_reviews   between 1 and 100),
  -- §38/§39: course ya semester ka breakdown is se kam reviews par nahi dikhta.
  breakdown_min_reviews smallint not null default 3  check (breakdown_min_reviews between 2 and 50),
  -- §42: Trending ki window aur us me kam se kam kitni reviews chahiye.
  trending_window_days  smallint not null default 30 check (trending_window_days  between 7 and 180),
  trending_min_reviews  smallint not null default 3  check (trending_min_reviews  between 2 and 50),
  updated_at            timestamptz not null default now(),
  updated_by            uuid references public.profiles (id) on delete set null
);

comment on table public.platform_settings is
  'Ranking aur privacy thresholds. Ek hi row (id = 1). Sirf admin function se likhi jati hai.';

insert into public.platform_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "public read platform settings" on public.platform_settings;
create policy "public read platform settings"
  on public.platform_settings for select
  to anon, authenticated
  using (true);

/*
  Column-level grant. `updated_by` jaan boojh kar bahar hai: wo admin ka
  internal record hai. Insert/update/delete ka koi grant kisi ko nahi.
*/
revoke all on public.platform_settings from anon, authenticated;

grant select (
  id,
  ranking_min_reviews,
  breakdown_min_reviews,
  trending_window_days,
  trending_min_reviews,
  updated_at
) on public.platform_settings to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) Threshold helpers
-- -----------------------------------------------------------------------------
/*
  Har function apni jagah settings padhti to query me ek aur subquery aati.
  Chhoti stable functions padhne me bhi aasan hain aur planner inline kar leta
  hai. `security invoker` hi rakha hai: policy upar public read deti hai, is
  liye definer banane ki koi wajah nahi.
*/
create or replace function public.ranking_min_reviews()
returns smallint
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    (select s.ranking_min_reviews from public.platform_settings s where s.id = 1),
    5::smallint
  );
$$;

create or replace function public.breakdown_min_reviews()
returns smallint
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    (select s.breakdown_min_reviews from public.platform_settings s where s.id = 1),
    3::smallint
  );
$$;

comment on function public.ranking_min_reviews() is
  'Ranking me shaamil hone ke liye kam se kam kitni verified reviews chahiye (README §40).';
comment on function public.breakdown_min_reviews() is
  'Course/semester breakdown is se kam reviews par chhupa rehta hai (privacy threshold).';

-- -----------------------------------------------------------------------------
-- 3) Admin setter - README §40 "Admin may configure the threshold"
-- -----------------------------------------------------------------------------
/*
  SECURITY DEFINER, magar pehla hi kaam is_admin() check hai. Frontend par button
  chhupa dena permission nahi hai; ijazat yahin banti hai.

  NULL bheja gaya parameter = "isay na chhero". Is liye admin ek value badal
  sakta hai bina baqi teen dobara bheje.
*/
create or replace function public.set_platform_settings(
  p_ranking_min_reviews   smallint default null,
  p_breakdown_min_reviews smallint default null,
  p_trending_window_days  smallint default null,
  p_trending_min_reviews  smallint default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'You do not have permission to change these settings.'
      using errcode = 'insufficient_privilege';
  end if;

  update public.platform_settings s
     set ranking_min_reviews   = coalesce(p_ranking_min_reviews,   s.ranking_min_reviews),
         breakdown_min_reviews = coalesce(p_breakdown_min_reviews, s.breakdown_min_reviews),
         trending_window_days  = coalesce(p_trending_window_days,  s.trending_window_days),
         trending_min_reviews  = coalesce(p_trending_min_reviews,  s.trending_min_reviews),
         updated_at            = now(),
         updated_by            = v_uid
   where s.id = 1;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  select
    v_uid,
    'settings.update',
    'platform_settings',
    null,
    jsonb_build_object(
      'rankingMinReviews',   s.ranking_min_reviews,
      'breakdownMinReviews', s.breakdown_min_reviews,
      'trendingWindowDays',  s.trending_window_days,
      'trendingMinReviews',  s.trending_min_reviews
    )
  from public.platform_settings s
  where s.id = 1;
end;
$$;

comment on function public.set_platform_settings(smallint, smallint, smallint, smallint) is
  'Admin thresholds badal sakta hai (README §40). NULL parameter = wo value waisi hi rehti hai. Har tabdeeli audit log me jati hai.';

-- -----------------------------------------------------------------------------
-- 4) Course-wise ratings (README §38)
-- -----------------------------------------------------------------------------
/*
  Ek teacher kai course parhata hai. Har course ka apna review count, apna
  overall, aur jahan data kaafi ho wahan criteria ka breakdown bhi.

  Threshold: jis course par breakdown_min_reviews se kam reviews hain, wo course
  is list me aata hi nahi. Chhupane ki wajah privacy hai: course + teacher ek
  section ki taraf ishara karta hai, aur ek hi review wale bucket par "yeh kis
  ne likhi" ka andaza lagana aasan ho jata hai.
*/
create or replace function public.person_course_ratings(p_person_id uuid)
returns table (
  course_id      uuid,
  course_slug    text,
  course_code    text,
  course_title   text,
  review_count   int,
  average_rating numeric,
  criteria       jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with scoped as (
    select r.id, r.course_id, r.overall_rating
      from public.reviews r
      join public.people p on p.id = r.person_id and p.is_active
     where r.person_id = p_person_id
       and r.status    = 'published'
       and r.course_id is not null
  ),
  agg as (
    select
      s.course_id                                as cid,
      count(*)::int                              as n,
      round(avg(s.overall_rating)::numeric, 2)   as avg_rating
    from scoped s
    group by s.course_id
    having count(*) >= public.breakdown_min_reviews()
  )
  select
    a.cid,
    c.slug,
    c.code,
    c.title,
    a.n,
    a.avg_rating,
    k.criteria
  from agg a
  join public.courses     c  on c.id  = a.cid and c.is_active
  join public.departments cd on cd.id = c.department_id and cd.is_active
  left join lateral (
    select coalesce(jsonb_agg(x.item order by x.sort_order), '[]'::jsonb) as criteria
    from (
      select
        cr.sort_order,
        jsonb_build_object(
          'key',           cr.key,
          'label',         cr.label,
          'kind',          cr.kind::text,
          'averageStar',   round(avg(an.star_value)::numeric, 2),
          'starResponses', count(an.star_value)::int,
          'yesCount',      count(*) filter (where an.bool_value)::int,
          'boolResponses', count(an.bool_value)::int
        ) as item
      from scoped s
      join public.review_answers  an on an.review_id = s.id
      join public.review_criteria cr on cr.id = an.criterion_id
      where s.course_id = a.cid
      group by cr.id, cr.key, cr.label, cr.kind, cr.sort_order
    ) x
  ) k on true
  order by a.n desc, c.title asc, a.cid asc;
$$;

comment on function public.person_course_ratings(uuid) is
  'Course-wise ratings (README §38). Chhote buckets privacy threshold ki wajah se list me nahi aate.';

-- -----------------------------------------------------------------------------
-- 5) Semester-wise ratings (README §39)
-- -----------------------------------------------------------------------------
create or replace function public.person_semester_ratings(p_person_id uuid)
returns table (
  semester_id     uuid,
  semester_label  text,
  semester_season public.semester_season,
  semester_year   int,
  review_count    int,
  average_rating  numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    r.semester_id,
    sm.label,
    sm.season,
    sm.year,
    count(*)::int                             as n,
    round(avg(r.overall_rating)::numeric, 2)  as avg_rating
  from public.reviews r
  join public.people    p  on p.id  = r.person_id and p.is_active
  join public.semesters sm on sm.id = r.semester_id
  where r.person_id = p_person_id
    and r.status    = 'published'
    and r.semester_id is not null
  group by r.semester_id, sm.label, sm.season, sm.year
  having count(*) >= public.breakdown_min_reviews()
  order by sm.year desc, sm.season asc, r.semester_id asc;
$$;

comment on function public.person_semester_ratings(uuid) is
  'Semester-wise aggregates (README §39). Sirf wahan jahan privacy threshold poora ho.';

-- -----------------------------------------------------------------------------
-- 6) course_teachers - "Database Systems" -> Teacher A, B, C (README §34)
-- -----------------------------------------------------------------------------
create or replace function public.course_teachers(
  p_course_id uuid,
  p_limit     int default 24,
  p_offset    int default 0
)
returns table (
  person_id           uuid,
  slug                text,
  full_name           text,
  display_name        text,
  gender              public.person_gender,
  photo_url           text,
  headline            text,
  role_title          text,
  department_short    text,
  average_rating      numeric,
  review_count        int,
  course_average      numeric,
  course_review_count int,
  semesters_taught    int,
  total_count         bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with params as (
    select
      least(greatest(coalesce(p_limit, 24), 1), 60) as row_limit,
      greatest(coalesce(p_offset, 0), 0)            as row_offset
  ),
  taught as (
    select
      ta.person_id                             as pid,
      count(distinct co.semester_id)::int      as semesters
    from public.teacher_assignments ta
    join public.course_offerings co on co.id = ta.course_offering_id and co.is_active
    join public.courses          c  on c.id  = co.course_id and c.is_active
    join public.departments      cd on cd.id = c.department_id and cd.is_active
    where co.course_id = p_course_id
      and ta.is_active
    group by ta.person_id
  ),
  course_stats as (
    select
      r.person_id                               as pid,
      count(*)::int                             as n,
      round(avg(r.overall_rating)::numeric, 2)  as avg_rating
    from public.reviews r
    where r.course_id = p_course_id
      and r.status    = 'published'
    group by r.person_id
    having count(*) >= public.breakdown_min_reviews()
  )
  select
    p.id,
    p.slug,
    p.full_name,
    p.display_name,
    p.gender,
    p.photo_url,
    p.headline,
    coalesce(pos.title, pr.title_override) as role_title,
    d.short_name,
    st.average_rating,
    coalesce(st.review_count, 0),
    cs.avg_rating,
    cs.n,
    t.semesters,
    count(*) over () as total_count
  from taught t
  join public.people p on p.id = t.pid and p.is_active
  join lateral (
    select pr.title_override, pr.position_id, pr.department_id
      from public.person_roles pr
     where pr.person_id = p.id
       and pr.is_active
       and pr.category in ('teacher', 'lab_instructor')
     order by pr.is_primary desc, pr.created_at asc
     limit 1
  ) pr on true
  left join public.positions          pos on pos.id = pr.position_id
  left join public.departments        d   on d.id   = pr.department_id and d.is_active
  left join public.person_rating_stats st  on st.person_id = p.id
  left join course_stats              cs  on cs.pid = p.id
  order by
    cs.avg_rating desc nulls last,
    cs.n          desc nulls last,
    p.full_name   asc,
    p.id          asc
  limit  (select row_limit  from params)
  offset (select row_offset from params);
$$;

comment on function public.course_teachers(uuid, int, int) is
  'Ek course ko parhane wale log (README §34). Per-course rating sirf privacy threshold ke baad dikhti hai.';

-- -----------------------------------------------------------------------------
-- 7) rankings - README §40
-- -----------------------------------------------------------------------------
/*
  Chaar scope: poori university, department, course, semester. Paanch categories
  (teacher, lab_instructor, faculty, university_staff, hr_staff) - is liye "Best
  Faculty", "Best Lab Instructor", "Best University Staff" aur "Best HR Staff"
  isi ek function se aate hain, alag alag code se nahi.

  ELIGIBILITY: scope ke andar kam se kam ranking_min_reviews reviews. Is se kam
  wala banda rating to dikhata hai magar ranking me nahi aata, warna ek review
  poora average bana deti.

  TARTEEB (deterministic, aur ginne me aasan):
    1. average rating, zyada pehle
    2. barabari par review count, zyada pehle
    3. phir bhi barabari par naam (A se Z)
    4. aakhir me id - do bilkul ek jaisi rows ka bhi hamesha ek hi tarteeb
  Koi weight, koi chhupa hua boost, koi manual slot nahi.

  NOTE: reviews.category review likhte waqt freeze hoti hai. Is liye ranking us
  ROLE par hoti hai jis ke liye review likhi gayi thi, banday ki aaj ki role par
  nahi. Internal teacher jo faculty bhi hai, dono lists me apni apni reviews ke
  saath aata hai.
*/
create or replace function public.rankings(
  p_category      public.person_category,
  p_scope         text default 'university',
  p_department_id uuid default null,
  p_course_id     uuid default null,
  p_semester_id   uuid default null,
  p_limit         int  default 10
)
returns table (
  rank             int,
  person_id        uuid,
  slug             text,
  full_name        text,
  display_name     text,
  gender           public.person_gender,
  photo_url        text,
  headline         text,
  role_title       text,
  department_short text,
  average_rating   numeric,
  review_count     int
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with params as (
    select
      /*
        Scope ka naam client se aata hai. Allow-list, aur uske saath yeh shart
        bhi ke us scope ki zaroori id mojood ho. Warna scope chup chaap
        'university' ban jata hai - khali list dene se behtar hai ke saaf
        university-level ranking di jaye.
      */
      case
        when lower(btrim(coalesce(p_scope, ''))) = 'department' and p_department_id is not null then 'department'
        when lower(btrim(coalesce(p_scope, ''))) = 'course'     and p_course_id     is not null then 'course'
        when lower(btrim(coalesce(p_scope, ''))) = 'semester'   and p_semester_id   is not null then 'semester'
        else 'university'
      end                                           as scope,
      least(greatest(coalesce(p_limit, 10), 1), 50) as row_limit,
      public.ranking_min_reviews()                  as min_reviews
  ),
  scoped as (
    select
      r.person_id                               as pid,
      count(*)::int                             as n,
      round(avg(r.overall_rating)::numeric, 2)  as avg_rating
    from params pm
    cross join public.reviews r
    where r.status   = 'published'
      and r.category = p_category
      and (pm.scope <> 'course'   or r.course_id   = p_course_id)
      and (pm.scope <> 'semester' or r.semester_id = p_semester_id)
    group by r.person_id
  )
  select
    row_number() over (
      order by s.avg_rating desc, s.n desc, p.full_name asc, p.id asc
    )::int as rank,
    p.id,
    p.slug,
    p.full_name,
    p.display_name,
    p.gender,
    p.photo_url,
    p.headline,
    coalesce(pos.title, pr.title_override) as role_title,
    d.short_name,
    s.avg_rating,
    s.n
  from params pm
  cross join scoped s
  join public.people p on p.id = s.pid and p.is_active
  join lateral (
    select pr.title_override, pr.position_id, pr.department_id
      from public.person_roles pr
     where pr.person_id = p.id
       and pr.category  = p_category
       and pr.is_active
       and (pm.scope <> 'department' or pr.department_id = p_department_id)
     order by pr.is_primary desc, pr.created_at asc
     limit 1
  ) pr on true
  left join public.positions   pos on pos.id = pr.position_id
  left join public.departments d   on d.id   = pr.department_id and d.is_active
  where s.n >= pm.min_reviews
  order by s.avg_rating desc, s.n desc, p.full_name asc, p.id asc
  limit (select row_limit from params);
$$;

comment on function public.rankings(public.person_category, text, uuid, uuid, uuid, int) is
  'Best-in-scope rankings (README §40). Scope allow-list se guzarta hai, eligibility DB ke threshold se, tarteeb poori tarah deterministic.';

-- -----------------------------------------------------------------------------
-- 8) most_reviewed - README §41
-- -----------------------------------------------------------------------------
/*
  Yeh "Best" NAHI hai. Yahan sirf ginti dekhi jati hai: kis par sab se zyada
  verified reviews aayi hain. Threshold yahan lagta hi nahi, kyunke sawal
  quality ka nahi, hajm ka hai. Rating sirf barabari torne ke liye.
*/
create or replace function public.most_reviewed(
  p_category public.person_category default null,
  p_limit    int                    default 10
)
returns table (
  person_id        uuid,
  slug             text,
  full_name        text,
  display_name     text,
  gender           public.person_gender,
  photo_url        text,
  headline         text,
  category         public.person_category,
  role_title       text,
  department_short text,
  average_rating   numeric,
  review_count     int
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with scoped as (
    select
      r.person_id                               as pid,
      r.category                                as cat,
      count(*)::int                             as n,
      round(avg(r.overall_rating)::numeric, 2)  as avg_rating
    from public.reviews r
    where r.status = 'published'
      and (p_category is null or r.category = p_category)
    group by r.person_id, r.category
  )
  select
    p.id,
    p.slug,
    p.full_name,
    p.display_name,
    p.gender,
    p.photo_url,
    p.headline,
    s.cat,
    coalesce(pos.title, pr.title_override) as role_title,
    d.short_name,
    s.avg_rating,
    s.n
  from scoped s
  join public.people p on p.id = s.pid and p.is_active
  left join lateral (
    select pr.title_override, pr.position_id, pr.department_id
      from public.person_roles pr
     where pr.person_id = p.id
       and pr.category  = s.cat
       and pr.is_active
     order by pr.is_primary desc, pr.created_at asc
     limit 1
  ) pr on true
  left join public.positions   pos on pos.id = pr.position_id
  left join public.departments d   on d.id   = pr.department_id and d.is_active
  order by s.n desc, s.avg_rating desc nulls last, p.full_name asc, p.id asc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

comment on function public.most_reviewed(public.person_category, int) is
  'Most Reviewed (README §41). Sirf valid review count. Best ranking se alag cheez hai.';

-- -----------------------------------------------------------------------------
-- 9) trending - README §42
-- -----------------------------------------------------------------------------
/*
  "Recent valid review activity while applying anti-abuse controls."

  Anti-abuse yahan chaar tehon par hai:
    1. WINDOW: sirf pichhle trending_window_days din. Purani activity trending
       nahi banati.
    2. FLOOR: window me kam se kam trending_min_reviews reviews. Ek review kisi
       ko trending nahi kar sakti, is liye ek banda apne aap ko trending nahi
       kar sakta.
    3. EK AUTHOR EK REVIEW: yeh DB ka structure hai (review_authors par unique
       index), is liye recent count amalan alag alag logon ki ginti hai.
    4. SIRF PUBLISHED: hataayi hui ya chhupi hui reviews ginti me nahi aati.
       Text ka moderation status rating par asar nahi daalta (§37), is liye
       pending text wali review bhi valid activity hai.

  Tarteeb: recent count, phir rating, phir naam. Koi decay curve, koi secret
  weight, koi randomness.
*/
create or replace function public.trending(
  p_category public.person_category default null,
  p_limit    int                    default 10
)
returns table (
  person_id        uuid,
  slug             text,
  full_name        text,
  display_name     text,
  gender           public.person_gender,
  photo_url        text,
  headline         text,
  category         public.person_category,
  role_title       text,
  department_short text,
  average_rating   numeric,
  review_count     int,
  recent_reviews   int,
  window_days      int
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with cfg as (
    select
      coalesce(
        (select s.trending_window_days from public.platform_settings s where s.id = 1),
        30::smallint
      ) as window_days,
      coalesce(
        (select s.trending_min_reviews from public.platform_settings s where s.id = 1),
        3::smallint
      ) as min_recent
  ),
  recent as (
    select
      r.person_id   as pid,
      r.category    as cat,
      count(*)::int as recent_n
    from cfg
    cross join public.reviews r
    where r.status = 'published'
      and r.created_at >= now() - make_interval(days => cfg.window_days::int)
      and (p_category is null or r.category = p_category)
    group by r.person_id, r.category
  ),
  overall as (
    select
      r.person_id                               as pid,
      r.category                                as cat,
      count(*)::int                             as n,
      round(avg(r.overall_rating)::numeric, 2)  as avg_rating
    from public.reviews r
    where r.status = 'published'
    group by r.person_id, r.category
  )
  select
    p.id,
    p.slug,
    p.full_name,
    p.display_name,
    p.gender,
    p.photo_url,
    p.headline,
    rc.cat,
    coalesce(pos.title, pr.title_override) as role_title,
    d.short_name,
    o.avg_rating,
    o.n,
    rc.recent_n,
    cfg.window_days::int
  from cfg
  cross join recent rc
  join public.people p on p.id = rc.pid and p.is_active
  join overall o on o.pid = rc.pid and o.cat = rc.cat
  left join lateral (
    select pr.title_override, pr.position_id, pr.department_id
      from public.person_roles pr
     where pr.person_id = p.id
       and pr.category  = rc.cat
       and pr.is_active
     order by pr.is_primary desc, pr.created_at asc
     limit 1
  ) pr on true
  left join public.positions   pos on pos.id = pr.position_id
  left join public.departments d   on d.id   = pr.department_id and d.is_active
  where rc.recent_n >= cfg.min_recent
  order by rc.recent_n desc, o.avg_rating desc nulls last, p.full_name asc, p.id asc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

comment on function public.trending(public.person_category, int) is
  'Trending (README §42). Window + floor + ek author ek review + sirf published. Best ranking se alag cheez hai.';

-- -----------------------------------------------------------------------------
-- 10) Grants - STANDING RULE: pehle sab wapas, phir sirf jo chahiye
-- -----------------------------------------------------------------------------
revoke all on function public.ranking_min_reviews()                     from public, anon, authenticated;
revoke all on function public.breakdown_min_reviews()                   from public, anon, authenticated;
revoke all on function public.person_course_ratings(uuid)               from public, anon, authenticated;
revoke all on function public.person_semester_ratings(uuid)             from public, anon, authenticated;
revoke all on function public.course_teachers(uuid, int, int)           from public, anon, authenticated;
revoke all on function public.most_reviewed(public.person_category, int) from public, anon, authenticated;
revoke all on function public.trending(public.person_category, int)     from public, anon, authenticated;
revoke all on function public.rankings(public.person_category, text, uuid, uuid, uuid, int)
  from public, anon, authenticated;
revoke all on function public.set_platform_settings(smallint, smallint, smallint, smallint)
  from public, anon, authenticated;

-- Public read: rankings aur aggregates bina login ke dikhte hain.
grant execute on function public.ranking_min_reviews()                      to anon, authenticated;
grant execute on function public.breakdown_min_reviews()                    to anon, authenticated;
grant execute on function public.person_course_ratings(uuid)                to anon, authenticated;
grant execute on function public.person_semester_ratings(uuid)              to anon, authenticated;
grant execute on function public.course_teachers(uuid, int, int)            to anon, authenticated;
grant execute on function public.most_reviewed(public.person_category, int) to anon, authenticated;
grant execute on function public.trending(public.person_category, int)      to anon, authenticated;
grant execute on function public.rankings(public.person_category, text, uuid, uuid, uuid, int)
  to anon, authenticated;

-- Settings likhna sirf logged-in user maang sakta hai, aur function khud
-- is_admin() par rukti hai. anon ko yahan bhi kuch nahi.
grant execute on function public.set_platform_settings(smallint, smallint, smallint, smallint)
  to authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * Course-wise aur semester-wise ratings mojood hain, magar chhote buckets
--     chhupe rehte hain (privacy).
--   * Rankings chaar scope aur paanch categories par chalti hain, ek hi
--     deterministic tarteeb ke saath.
--   * Most Reviewed aur Trending alag functions hain, Best se mila hua nahi.
--   * Threshold admin badal sakta hai, magar sirf audit log ke saath.
-- =============================================================================
