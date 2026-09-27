-- =============================================================================
-- ProfAura Phase 4 (C) - Favorites, Recently Viewed, Comparison, Recommendations
-- README §43, §44, §45, §46, §84
-- =============================================================================
-- MAQSAD:
--   §43 teacher comparison, §44 deterministic recommendation system (koi LLM
--   nahi), §45 private favorites, §46 private recently viewed.
--
-- ASOOL:
--   1. FAVORITES aur RECENTLY VIEWED ZAATI hain. anon ko in tables par kuch
--      nahi milta, aur logged-in banda sirf apni rows dekh sakta hai. Write ka
--      koi table grant kisi ko nahi: sab kuch function se hota hai.
--   2. §46: "Do not store unnecessary PII in localStorage". Is liye history
--      browser me nahi, server par us banday ke apne account ke saath rehti
--      hai, aur sirf 20 aakhri profiles tak mehdood hai.
--   3. §44: "Use a deterministic scoring model" aur "Do NOT add an LLM/AI API".
--      Score ka har hissa neeche likha hua hai, weights fixed hain, koi
--      randomness nahi. Ek hi data par natija hamesha wahi aata hai.
--   4. COMPARISON public hai (login ke baghair bhi), kyunke wo sirf pehle se
--      public aggregates dikhati hai.
--
-- DATA SAFETY (§27):
--   Additive. Do nayi private tables aur naye functions. Koi maujooda table,
--   column, policy ya grant nahi chhira gaya.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) favorites - README §45
-- -----------------------------------------------------------------------------
create table if not exists public.favorites (
  student_id uuid not null references public.profiles (id) on delete cascade,
  person_id  uuid not null references public.people (id)   on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, person_id)
);

comment on table public.favorites is
  'PRIVATE. Kis student ne kaunsi profile save ki. anon ko koi grant nahi; student sirf apni rows parhta hai.';

create index if not exists favorites_student_idx
  on public.favorites (student_id, created_at desc);

alter table public.favorites enable row level security;

/*
  Supabase naye tables par default privileges se anon/authenticated ko sab kuch
  de deta hai. Is liye pehle sab wapas lena ZAROORI hai, warna ek private table
  chup chaap public ban jati hai.
*/
revoke all on public.favorites from anon, authenticated;
grant select on public.favorites to authenticated;

drop policy if exists "student reads own favorites" on public.favorites;
create policy "student reads own favorites"
  on public.favorites for select
  to authenticated
  using (student_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2) recently_viewed - README §46
-- -----------------------------------------------------------------------------
create table if not exists public.recently_viewed (
  student_id uuid not null references public.profiles (id) on delete cascade,
  person_id  uuid not null references public.people (id)   on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (student_id, person_id)
);

comment on table public.recently_viewed is
  'PRIVATE rolling history, har student ke aakhri 20 profiles. anon ko koi grant nahi.';

create index if not exists recently_viewed_student_idx
  on public.recently_viewed (student_id, viewed_at desc);

alter table public.recently_viewed enable row level security;

revoke all on public.recently_viewed from anon, authenticated;
grant select on public.recently_viewed to authenticated;

drop policy if exists "student reads own history" on public.recently_viewed;
create policy "student reads own history"
  on public.recently_viewed for select
  to authenticated
  using (student_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 3) Write functions - inhi ke zariye likha ja sakta hai
-- -----------------------------------------------------------------------------
/*
  toggle_favorite: pehle se saved ho to hata do, warna laga do. Return value
  batati hai ke ab halat kya hai, is liye UI ko dobara poochhne ki zaroorat nahi.

  SECURITY DEFINER hai, magar pehla kaam yehi dekhna hai ke banda logged in hai
  aur uska profile mojood hai. anon ko is function ka grant bhi nahi diya gaya.
*/
create or replace function public.toggle_favorite(p_person_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_removed int;
begin
  if v_uid is null then
    raise exception 'Sign in to save a profile.'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.profiles pf where pf.id = v_uid) then
    raise exception 'Sign in to save a profile.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Chhupi hui ya hataayi hui profile save nahi ho sakti.
  if not exists (select 1 from public.people p where p.id = p_person_id and p.is_active) then
    raise exception 'That profile is not available.'
      using errcode = 'no_data_found';
  end if;

  delete from public.favorites f
   where f.student_id = v_uid
     and f.person_id  = p_person_id;

  get diagnostics v_removed = row_count;

  if v_removed > 0 then
    return false;
  end if;

  insert into public.favorites (student_id, person_id)
  values (v_uid, p_person_id)
  on conflict (student_id, person_id) do nothing;

  return true;
end;
$$;

comment on function public.toggle_favorite(uuid) is
  'Profile ko save/unsave karta hai (README §45). Return: true = ab saved hai.';

/*
  record_person_view: history ka ek row upsert karta hai aur phir us student ke
  sirf aakhri 20 rows rehne deta hai.

  Trim function ke andar hai, migration me nahi: yeh us banday ka apna rolling
  record hai, koi review ya business data nahi. 20 ka cap §84 (koi unbounded
  growth) aur §46 (minimum data rakho) dono ki wajah se hai.
*/
create or replace function public.record_person_view(p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Logged out visitor ki koi history nahi rakhi jati. Yeh khamoshi se nikal
  -- jata hai, error nahi deta: profile dekhna har kisi ka haq hai.
  if v_uid is null then
    return;
  end if;

  if not exists (select 1 from public.profiles pf where pf.id = v_uid) then
    return;
  end if;

  if not exists (select 1 from public.people p where p.id = p_person_id and p.is_active) then
    return;
  end if;

  insert into public.recently_viewed (student_id, person_id, viewed_at)
  values (v_uid, p_person_id, now())
  on conflict (student_id, person_id)
  do update set viewed_at = now();

  delete from public.recently_viewed rv
   where rv.student_id = v_uid
     and rv.person_id not in (
       select r2.person_id
         from public.recently_viewed r2
        where r2.student_id = v_uid
        order by r2.viewed_at desc, r2.person_id asc
        limit 20
     );
end;
$$;

comment on function public.record_person_view(uuid) is
  'Recently viewed history (README §46). Sirf logged-in banday ke liye, aakhri 20 tak mehdood.';

-- -----------------------------------------------------------------------------
-- 4) Private read functions
-- -----------------------------------------------------------------------------
/*
  Dono SECURITY INVOKER hain. Matlab RLS khud hi sirf apni rows deti hai, aur
  hum ne "kis ki rows" ka faisla policy par chhora hai, apne code par nahi.
*/
create or replace function public.my_favorites(
  p_limit  int default 24,
  p_offset int default 0
)
returns table (
  person_id        uuid,
  slug             text,
  full_name        text,
  display_name     text,
  gender           public.person_gender,
  photo_url        text,
  headline         text,
  primary_category public.person_category,
  role_title       text,
  department_short text,
  average_rating   numeric,
  review_count     int,
  saved_at         timestamptz,
  total_count      bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.slug,
    p.full_name,
    p.display_name,
    p.gender,
    p.photo_url,
    p.headline,
    p.primary_category,
    coalesce(pos.title, pr.title_override) as role_title,
    d.short_name,
    st.average_rating,
    coalesce(st.review_count, 0),
    f.created_at,
    count(*) over () as total_count
  from public.favorites f
  join public.people p on p.id = f.person_id and p.is_active
  left join lateral (
    select pr.title_override, pr.position_id, pr.department_id
      from public.person_roles pr
     where pr.person_id = p.id
       and pr.is_active
     order by pr.is_primary desc, pr.created_at asc
     limit 1
  ) pr on true
  left join public.positions          pos on pos.id = pr.position_id
  left join public.departments        d   on d.id   = pr.department_id and d.is_active
  left join public.person_rating_stats st  on st.person_id = p.id
  order by f.created_at desc, p.full_name asc, p.id asc
  limit  least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.my_recently_viewed(p_limit int default 8)
returns table (
  person_id        uuid,
  slug             text,
  full_name        text,
  display_name     text,
  gender           public.person_gender,
  photo_url        text,
  headline         text,
  primary_category public.person_category,
  role_title       text,
  department_short text,
  average_rating   numeric,
  review_count     int,
  viewed_at        timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.slug,
    p.full_name,
    p.display_name,
    p.gender,
    p.photo_url,
    p.headline,
    p.primary_category,
    coalesce(pos.title, pr.title_override) as role_title,
    d.short_name,
    st.average_rating,
    coalesce(st.review_count, 0),
    rv.viewed_at
  from public.recently_viewed rv
  join public.people p on p.id = rv.person_id and p.is_active
  left join lateral (
    select pr.title_override, pr.position_id, pr.department_id
      from public.person_roles pr
     where pr.person_id = p.id
       and pr.is_active
     order by pr.is_primary desc, pr.created_at asc
     limit 1
  ) pr on true
  left join public.positions          pos on pos.id = pr.position_id
  left join public.departments        d   on d.id   = pr.department_id and d.is_active
  left join public.person_rating_stats st  on st.person_id = p.id
  order by rv.viewed_at desc, p.id asc
  limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

/*
  my_favorite_person_ids: profile page par dil bhara hua dikhane ke liye. Sirf
  ids, kuch aur nahi.
*/
create or replace function public.my_favorite_person_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select f.person_id from public.favorites f;
$$;

comment on function public.my_favorites(int, int) is
  'Apni saved profiles (README §45). Security invoker, is liye RLS hi tay karti hai ke kis ki rows hain.';
comment on function public.my_recently_viewed(int) is
  'Apni recently viewed profiles (README §46).';
comment on function public.my_favorite_person_ids() is
  'Sirf ids, taake UI save button ki halat dikha sake.';

-- -----------------------------------------------------------------------------
-- 5) compare_people - README §43
-- -----------------------------------------------------------------------------
/*
  Do se chaar logon ka side-by-side. Sab kuch wahi aggregates hain jo profile
  par pehle se public hain, is liye yeh function public read hai.

  Tarteeb caller ki di hui tarteeb hai (with ordinality), taake UI ke columns
  hilte na rahein. Duplicate ids ek hi dafa aate hain.
*/
create or replace function public.compare_people(
  p_ids      uuid[],
  p_category public.person_category default 'teacher'
)
returns table (
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
  review_count     int,
  criteria         jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with wanted as (
    select t.pid, min(t.ord) as ord
      from unnest(coalesce(p_ids, '{}'::uuid[])) with ordinality as t(pid, ord)
     group by t.pid
     order by min(t.ord)
     limit 4
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
    sc.avg_rating,
    coalesce(sc.n, 0),
    k.criteria
  from wanted w
  join public.people p on p.id = w.pid and p.is_active
  left join lateral (
    select pr.title_override, pr.position_id, pr.department_id
      from public.person_roles pr
     where pr.person_id = p.id
       and pr.category  = p_category
       and pr.is_active
     order by pr.is_primary desc, pr.created_at asc
     limit 1
  ) pr on true
  left join public.positions   pos on pos.id = pr.position_id
  left join public.departments d   on d.id   = pr.department_id and d.is_active
  left join lateral (
    -- Rating usi category ki reviews se, warna do alag role ka data mil jata.
    select
      count(*)::int                             as n,
      round(avg(r.overall_rating)::numeric, 2)  as avg_rating
    from public.reviews r
    where r.person_id = p.id
      and r.status    = 'published'
      and r.category  = p_category
  ) sc on true
  left join lateral (
    select coalesce(jsonb_agg(x.item order by x.sort_order), '[]'::jsonb) as criteria
    from (
      select
        cs.sort_order,
        jsonb_build_object(
          'key',           cs.key,
          'label',         cs.label,
          'kind',          cs.kind::text,
          'averageStar',   cs.average_star,
          'starResponses', cs.star_responses,
          'yesCount',      cs.yes_count,
          'boolResponses', cs.bool_responses
        ) as item
      from public.person_criteria_stats cs
      where cs.person_id = p.id
        and cs.category  = p_category
    ) x
  ) k on true
  order by w.ord asc;
$$;

comment on function public.compare_people(uuid[], public.person_category) is
  'Side-by-side comparison (README §43). Max 4 log, sirf wahi aggregates jo pehle se public hain.';

-- -----------------------------------------------------------------------------
-- 6) recommend_teachers - README §44
-- -----------------------------------------------------------------------------
/*
  DETERMINISTIC SCORING MODEL. Kul 100 points, aur har point ka hisaab yahan
  likha hua hai:

    45  quality        average rating / 10 * 45
    15  confidence     min(review count, 20) / 20 * 15
    15  course match   isi course ko parha chuke hain
     8  semester match wahi course usi semester me parhaya
     5  department     wahi department
     5  program        us program me parhate hain
     2  section        wahi section parhaya
     5  recent         pichhle 90 din me koi verified review aayi

  Koi randomness, koi paid slot, koi chhupa hua weight. Ek hi data par yeh
  function hamesha wahi tarteeb deti hai.

  ELIGIBILITY: ranking wala hi threshold. 5 reviews se kam par kisi ko
  "recommended" kehna galat impression deta hai, chahe uska average acha ho.

  RELEVANCE: agar course/department/program me se kuch bhi diya gaya ho to us se
  taalluq lazmi hai. Bina taalluq wale log list me nahi aate. Agar kuch bhi na
  diya jaye to natija saaf "sab se behtar rated" ban jata hai.
*/
create or replace function public.recommend_teachers(
  p_course_id     uuid                  default null,
  p_department_id uuid                  default null,
  p_program_id    uuid                  default null,
  p_semester_id   uuid                  default null,
  p_section       text                  default null,
  p_category      public.person_category default 'teacher',
  p_limit         int                   default 5
)
returns table (
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
  review_count     int,
  score            numeric,
  reasons          text[],
  strengths        jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with cfg as (
    select
      public.ranking_min_reviews()   as min_reviews,
      public.breakdown_min_reviews() as min_responses,
      nullif(btrim(coalesce(p_section, '')), '') as section_term
  ),
  stats as (
    select
      r.person_id                               as pid,
      count(*)::int                             as n,
      round(avg(r.overall_rating)::numeric, 2)  as avg_rating
    from public.reviews r
    where r.status   = 'published'
      and r.category = p_category
    group by r.person_id
  ),
  recent as (
    select r.person_id as pid, count(*)::int as n
    from public.reviews r
    where r.status   = 'published'
      and r.category = p_category
      and r.created_at >= now() - interval '90 days'
    group by r.person_id
  ),
  taught as (
    select
      ta.person_id as pid,
      bool_or(p_course_id is not null and co.course_id = p_course_id) as course_match,
      bool_or(
        p_course_id is not null and p_semester_id is not null
        and co.course_id = p_course_id and co.semester_id = p_semester_id
      ) as course_semester_match,
      bool_or(p_program_id is not null and co.program_id = p_program_id) as program_match,
      bool_or(
        (select cfg.section_term from cfg) is not null
        and co.section is not null
        and lower(btrim(co.section)) = lower((select cfg.section_term from cfg))
        and (p_course_id is null or co.course_id = p_course_id)
      ) as section_match
    from public.teacher_assignments ta
    join public.course_offerings co on co.id = ta.course_offering_id and co.is_active
    join public.courses          c  on c.id  = co.course_id and c.is_active
    join public.departments      cd on cd.id = c.department_id and cd.is_active
    where ta.is_active
    group by ta.person_id
  ),
  cand as (
    select
      p.id,
      p.slug,
      p.full_name,
      p.display_name,
      p.gender,
      p.photo_url,
      p.headline,
      coalesce(pos.title, pr.title_override)  as role_title,
      d.short_name                            as department_short,
      s.avg_rating,
      s.n,
      coalesce(t.course_match, false)          as cm,
      coalesce(t.course_semester_match, false) as csm,
      coalesce(t.program_match, false)         as pm,
      coalesce(t.section_match, false)         as sm,
      (p_department_id is not null and pr.department_id = p_department_id) as dm,
      coalesce(rc.n, 0)                        as recent_n
    from cfg
    cross join stats s
    join public.people p on p.id = s.pid and p.is_active
    join lateral (
      select pr.title_override, pr.position_id, pr.department_id
        from public.person_roles pr
       where pr.person_id = p.id
         and pr.category  = p_category
         and pr.is_active
       order by pr.is_primary desc, pr.created_at asc
       limit 1
    ) pr on true
    left join public.positions   pos on pos.id = pr.position_id
    left join public.departments d   on d.id   = pr.department_id and d.is_active
    left join taught t  on t.pid  = p.id
    left join recent rc on rc.pid = p.id
    where s.n >= cfg.min_reviews
      and (
        (p_course_id is null and p_department_id is null and p_program_id is null)
        or coalesce(t.course_match, false)
        or coalesce(t.program_match, false)
        or (p_department_id is not null and pr.department_id = p_department_id)
      )
  ),
  scored as (
    select
      c.*,
      round(
          (c.avg_rating / 10.0) * 45
        + (least(c.n, 20)::numeric / 20) * 15
        + case when c.cm       then 15 else 0 end
        + case when c.csm      then  8 else 0 end
        + case when c.dm       then  5 else 0 end
        + case when c.pm       then  5 else 0 end
        + case when c.sm       then  2 else 0 end
        + case when c.recent_n > 0 then 5 else 0 end
      , 1) as total_score
    from cand c
  )
  select
    sc.id,
    sc.slug,
    sc.full_name,
    sc.display_name,
    sc.gender,
    sc.photo_url,
    sc.headline,
    sc.role_title,
    sc.department_short,
    sc.avg_rating,
    sc.n,
    sc.total_score,
    -- §44: "why the teacher was suggested". Sirf wo wajah jo asal me lagi.
    array_remove(
      array[
        case when sc.cm  then 'Taught this course' end,
        case when sc.csm then 'Taught this course in the selected semester' end,
        case when sc.sm  then 'Taught the selected section' end,
        case when sc.dm  then 'Same department' end,
        case when sc.pm  then 'Teaches in the selected program' end,
        'Rated ' || to_char(sc.avg_rating, 'FM990.0') || ' out of 10 from '
          || sc.n || ' verified reviews',
        case when sc.recent_n > 0 then 'Reviewed recently by students' end
      ],
      null
    ) as reasons,
    k.strengths
  from scored sc
  left join lateral (
    -- §44: "key strengths". Sab se acha rated teen star criteria, aur sirf
    -- wahan jahan kaafi jawab mojood hon.
    select coalesce(jsonb_agg(x.item order by x.avg_star desc, x.label asc), '[]'::jsonb) as strengths
    from (
      select
        cs.label                as label,
        cs.average_star         as avg_star,
        jsonb_build_object(
          'key',         cs.key,
          'label',       cs.label,
          'averageStar', cs.average_star
        ) as item
      from public.person_criteria_stats cs
      cross join cfg
      where cs.person_id      = sc.id
        and cs.category       = p_category
        and cs.kind           = 'star'
        and cs.star_responses >= cfg.min_responses
      order by cs.average_star desc nulls last, cs.label asc
      limit 3
    ) x
  ) k on true
  order by
    sc.total_score desc,
    sc.avg_rating  desc nulls last,
    sc.n           desc,
    sc.full_name   asc,
    sc.id          asc
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

comment on function public.recommend_teachers(uuid, uuid, uuid, uuid, text, public.person_category, int) is
  'Deterministic recommendations (README §44). Weights function ke comment me likhe hain. Koi LLM, koi randomness, koi promoted slot nahi.';

-- -----------------------------------------------------------------------------
-- 7) Grants - STANDING RULE: pehle sab wapas, phir sirf jo chahiye
-- -----------------------------------------------------------------------------
revoke all on function public.toggle_favorite(uuid)            from public, anon, authenticated;
revoke all on function public.record_person_view(uuid)         from public, anon, authenticated;
revoke all on function public.my_favorites(int, int)           from public, anon, authenticated;
revoke all on function public.my_recently_viewed(int)          from public, anon, authenticated;
revoke all on function public.my_favorite_person_ids()         from public, anon, authenticated;
revoke all on function public.compare_people(uuid[], public.person_category)
  from public, anon, authenticated;
revoke all on function public.recommend_teachers(uuid, uuid, uuid, uuid, text, public.person_category, int)
  from public, anon, authenticated;

-- Zaati cheezein sirf logged-in banday ke liye. anon ko kuch nahi.
grant execute on function public.toggle_favorite(uuid)    to authenticated;
grant execute on function public.record_person_view(uuid) to authenticated;
grant execute on function public.my_favorites(int, int)   to authenticated;
grant execute on function public.my_recently_viewed(int)  to authenticated;
grant execute on function public.my_favorite_person_ids() to authenticated;

-- Comparison aur recommendations public read hain.
grant execute on function public.compare_people(uuid[], public.person_category)
  to anon, authenticated;
grant execute on function public.recommend_teachers(uuid, uuid, uuid, uuid, text, public.person_category, int)
  to anon, authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * Student profiles save kar sakta hai, aur wo list sirf usay dikhti hai.
--   * Recently viewed server par rehti hai, browser storage me nahi, aur 20 par
--     ruk jati hai.
--   * Comparison do se chaar logon ka ek hi call me aata hai.
--   * Recommendations ek likhe hue scoring model se aati hain aur har suggestion
--     ke saath uski wajah bhi aati hai.
-- =============================================================================
