-- =============================================================================
-- ProfAura — Migration 0010: Review course/semester context + uniqueness
-- -----------------------------------------------------------------------------
-- README §25 ka asal masla yeh hai:
--
--   "Ek banday par ek review" GHALAT rule hai.
--
-- Ek student usi teacher se agle semester me doosra course parh sakta hai, aur
-- us tajurbe ki apni alag review honi chahiye. Is liye uniqueness ab yeh hai:
--
--   Teacher / Lab Instructor :  student + person + COURSE + SEMESTER
--   Baqi roles (staff, HR)   :  student + person + CATEGORY + SEMESTER
--                               (semester hi "review period" hai)
--
-- Yeh rule DATABASE me lagta hai, sirf form me nahi:
--   * do partial UNIQUE indexes `review_authors` par (asli taala)
--   * `submit_review()` me saaf message ke liye pehle se check
--   * `reviews` par check constraint: course sirf course-wale roles par
--
-- PURANA DATA MEHFOOZ HAI. Jo reviews pehle se hain un me course/semester null
-- hain. Naye columns nullable hain, purani rows waise hi rehti hain, aur
-- unique indexes me NULL alag ginta hai is liye koi purani row nahi tootegi.
-- Naye reviews ke liye `submit_review()` dono cheezein lazmi karta hai.
--
-- KUCH BHI DROP NAHI HOTA: na table, na data. Sirf ek purana unique constraint
-- (author_id, person_id) hatta hai, kyunke wohi rule ab ghalat hai.
-- =============================================================================

begin;

-- =============================================================================
-- 1) reviews: course + semester ka context
-- =============================================================================
-- on delete restrict JAAN BOOJH KAR hai: agar kisi course par reviews mojood
-- hain to wo course delete nahi hona chahiye, warna reviews ka context gum ho
-- jata hai. Reference data ko band karne ka tareeqa `is_active = false` hai,
-- delete nahi.
alter table public.reviews
  add column if not exists course_id uuid references public.courses (id) on delete restrict;

alter table public.reviews
  add column if not exists semester_id uuid references public.semesters (id) on delete restrict;

comment on column public.reviews.course_id is
  'Teacher/Lab Instructor reviews ke liye lazmi. Baqi roles par hamesha null.';
comment on column public.reviews.semester_id is
  'Kis semester ka tajurba hai. Non-course roles ke liye yehi "review period" hai.';

-- Course sirf un roles par lag sakta hai jo course parhate hain.
-- NOT VALID: purani rows (jin me course null hai) check nahi hotin, magar har
-- nai row aur har update par yeh constraint poora lagta hai.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname  = 'reviews_course_only_for_course_roles'
       and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_course_only_for_course_roles
      check (
        course_id is null
        or category in ('teacher', 'lab_instructor')
      )
      not valid;
  end if;
end
$$;

create index if not exists reviews_course_idx
  on public.reviews (course_id)
  where course_id is not null;

create index if not exists reviews_semester_idx
  on public.reviews (semester_id)
  where semester_id is not null;

-- =============================================================================
-- 2) review_authors: uniqueness ka naya scope
-- =============================================================================
-- Yaad rahe `review_authors` PRIVATE hai (anon ko koi grant nahi, RLS sirf apni
-- row deti hai). Course/semester ki nakal yahan sirf is liye rakhi ja rahi hai
-- ke unique index ko author_id ke saath ek hi table chahiye.
alter table public.review_authors
  add column if not exists category public.person_category;

alter table public.review_authors
  add column if not exists course_id uuid references public.courses (id) on delete restrict;

alter table public.review_authors
  add column if not exists semester_id uuid references public.semesters (id) on delete restrict;

-- Purani rows ki category reviews se bhar do taake wo bhi naye rule me fit hon.
-- Course/semester nahi bhare ja sakte (wo us waqt poocha hi nahi gaya tha), aur
-- unhe andaze se bharna data ghalat kar dega.
update public.review_authors ra
   set category = r.category
  from public.reviews r
 where r.id = ra.review_id
   and ra.category is null;

-- PURANA RULE HATAO: "ek banday par ek review" ab ghalat hai.
-- Naam se drop karne ke saath saath dhoond kar bhi drop karte hain, kyunke yeh
-- constraint manually apply hui thi aur naam mukhtalif ho sakta hai.
alter table public.review_authors
  drop constraint if exists review_authors_author_id_person_id_key;

do $$
declare
  v_name text;
begin
  select con.conname into v_name
    from pg_constraint con
   where con.conrelid = 'public.review_authors'::regclass
     and con.contype  = 'u'
     and (
       select array_agg(att.attname::text order by att.attname)
         from unnest(con.conkey) as k(attnum)
         join pg_attribute att
           on att.attrelid = con.conrelid and att.attnum = k.attnum
     ) = array['author_id', 'person_id']
   limit 1;

  if v_name is not null then
    execute format('alter table public.review_authors drop constraint %I', v_name);
  end if;
end
$$;

-- NAYA TAALA #1 — course wale roles: student + person + course + semester.
create unique index if not exists review_authors_course_scope_idx
  on public.review_authors (author_id, person_id, course_id, semester_id)
  where course_id is not null;

-- NAYA TAALA #2 — baqi roles: student + person + category + period.
-- `nulls not distinct` zaroori hai warna do null semester wali rows aapas me
-- takrayengi hi nahi aur purana data duplicate ho sakta hai.
create unique index if not exists review_authors_period_scope_idx
  on public.review_authors (author_id, person_id, category, semester_id)
  nulls not distinct
  where course_id is null;

-- =============================================================================
-- 3) Column grants — naye columns public list/filters ke liye chahiye
-- =============================================================================
-- Migration 0009 me `reviews` par table-level select revoke kar ke sirf chuni
-- hui columns di gai thin. Naye do columns bhi usi list me daalne parenge,
-- warna `person_rating_stats` jaisi views aur filters kaam nahi karenge.
-- `comment`, `moderated_at`, `moderated_by` ab bhi JAAN BOOJH KAR bahar hain.
grant select (course_id, semester_id) on public.reviews to anon, authenticated;

-- =============================================================================
-- 4) Review options — student ko kaunse course/semester dikhein
-- =============================================================================
-- Pehli tarjeeh: jo offerings us banday ne waqai parhai hain
-- (teacher_assignments). Agar admin ne abhi assignments nahi bhare, to us ke
-- department ke active courses + haal ke semesters fallback hain, warna review
-- likhna hi mumkin na rehta.
--
-- SECURITY DEFINER hai kyunke yeh kai reference tables ko jorhta hai; magar
-- data poora public reference data hai, koi private cheez yahan se nahi milti.
create or replace function public.person_review_options(p_person_id uuid)
returns table (
  course_id      uuid,
  course_code    text,
  course_title   text,
  semester_id    uuid,
  semester_label text,
  is_assigned    boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with target as (
    -- submit_review bhi PRIMARY category hi dekhta hai. Dono jagah ek hi
    -- source hona zaroori hai, warna form aisa option dikha dega jo server
    -- rad kar de.
    select p.id, p.primary_category
      from public.people p
     where p.id = p_person_id
       and p.is_active
  ),
  needs_course as (
    select exists (
      select 1 from target t
       where t.primary_category in ('teacher', 'lab_instructor')
    ) as yes
  ),
  /*
    Yeh function SECURITY DEFINER hai, is liye `courses` par lagi RLS khud
    chalti nahi. Us policy ki shart (course active AND us ka department active)
    yahan HAATH SE dohrani zaroori hai — warna koi bhi logged-in user band
    course ya band department ke courses ginn sakta hai.

    Sath hi `c.is_active` isi liye bhi lazmi hai ke submit_review khud yeh
    check karti hai; agar picker band course dikha de to user ko submit par
    "Choose a valid course." milega, jo sirf uljhan hai.
  */
  assigned as (
    select distinct co.course_id, co.semester_id
      from public.teacher_assignments ta
      join public.course_offerings co
        on co.id = ta.course_offering_id
       and co.is_active
      join public.courses c
        on c.id = co.course_id
       and c.is_active
      join public.departments d
        on d.id = c.department_id
       and d.is_active
     where ta.person_id = p_person_id
       and ta.is_active
       and (select yes from needs_course)
  ),
  recent_semesters as (
    select s.id
      from public.semesters s
     order by s.year desc, s.season desc
     limit 6
  ),
  fallback as (
    select distinct c.id as course_id, rs.id as semester_id
      from public.person_roles pr
      join public.departments d
        on d.id = pr.department_id
       and d.is_active
      join public.courses c
        on c.department_id = d.id
       and c.is_active
      cross join recent_semesters rs
     where pr.person_id = p_person_id
       and pr.is_active
       and pr.department_id is not null
       and (select yes from needs_course)
       and not exists (select 1 from assigned)
  ),
  -- Faculty / uni staff / HR par course ka koi matlab nahi (README §25), magar
  -- semester phir bhi lazmi hai. In ke liye sirf review-period ki list.
  periods as (
    select distinct null::uuid as course_id, rs.id as semester_id
      from recent_semesters rs
     where not (select yes from needs_course)
       and exists (select 1 from target)
  ),
  pairs as (
    select a.course_id, a.semester_id, true as is_assigned from assigned a
    union all
    select f.course_id, f.semester_id, false from fallback f
    union all
    select p2.course_id, p2.semester_id, false from periods p2
  )
  select
    c.id,
    c.code,
    c.title,
    s.id,
    s.label,
    pairs.is_assigned
  from pairs
  -- LEFT join: staff wali rows me course hota hi nahi.
  left join public.courses c on c.id = pairs.course_id
  join public.semesters s on s.id = pairs.semester_id
  order by c.title nulls first, s.year desc, s.season desc
  limit 400;
$$;

comment on function public.person_review_options(uuid) is
  'Review form ke liye course+semester ke jaiz jorey. Assignments na hon to department ka fallback.';

-- =============================================================================
-- 5) submit_review — ab course + semester ke saath
-- =============================================================================
-- Signature badal rahi hai, is liye purana function drop karna parega.
-- (create or replace arguments nahi badal sakta.)
drop function if exists public.submit_review(uuid, smallint, text, jsonb);

create function public.submit_review(
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

    -- Agar admin ne is banday ki assignments bhari hain to unhi me se chunna
    -- hoga. Assignments khali hon to department ka fallback chalta hai, magar
    -- course phir bhi usi department ka hona chahiye.
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
      -- Fallback raste me sirf department ka jor dekha jata hai, semester ka
      -- nahi (assignments hi nahi hain to semester se milane ko kuch nahi).
      -- Is liye message bhi sirf course ki baat kare.
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
    -- Staff/HR par course ka koi matlab nahi. Client jo bhi bheje, giraa do.
    v_course_id := null;
  end if;

  -- ---------------------------------------------------------------------------
  -- UNIQUENESS (README §25). Asli taala unique index hai; yeh sirf is liye hai
  -- ke user ko "23505" ki jagah insaani jumla mile.
  -- ---------------------------------------------------------------------------
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

  -- Rate limit: ek din me itni se zyada nahi.
  select max_per_day into v_max_day from public.review_limits();

  select count(*)::int into v_today
    from public.review_authors ra
   where ra.author_id = v_uid
     and ra.created_at > now() - interval '24 hours';

  if v_today >= v_max_day then
    raise exception 'You have reached the daily limit for new reviews.' using errcode = 'check_violation';
  end if;

  -- Overall 1-10 hai (README §15). Criteria ke stars alag 1-5 hain.
  if p_overall is null or p_overall < 1 or p_overall > 10 then
    raise exception 'Give an overall rating between 1 and 10.' using errcode = 'check_violation';
  end if;

  v_comment := nullif(btrim(coalesce(p_comment, '')), '');

  -- README §21: had 150 WORDS hai. Char limit doosri deewar hai.
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

comment on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid) is
  'Naya review. Verified student, course+semester ka jaiz jorha, README §25 wali uniqueness, daily limit aur poore answers - sab yahin check hote hain.';

-- =============================================================================
-- 6) Read functions ab context bhi dete hain
-- =============================================================================
-- OUT columns badal rahe hain, is liye drop + create.

drop function if exists public.person_reviews(uuid, int, int, boolean, boolean);

create function public.person_reviews(
  p_person_id     uuid,
  p_limit         int     default 10,
  p_offset        int     default 0,
  p_featured_only boolean default false,
  p_oldest_first  boolean default false,
  p_course_id     uuid    default null,
  p_semester_id   uuid    default null
)
returns table (
  review_id      uuid,
  overall_rating smallint,
  comment        text,
  is_featured    boolean,
  was_edited     boolean,
  created_at     timestamptz,
  updated_at     timestamptz,
  course_code    text,
  course_title   text,
  semester_label text,
  answers        jsonb,
  total_count    bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  /*
    GUMNAAMI KA HISAAB (README §21).

    Course + semester ek review par "quasi-identifier" hai: agar kisi section me
    sirf 1-2 students ne review ki ho, to "CS-301, Fall 2025" likh dena us ek
    bande ki taraf ungli utha deta hai. Ratings public hain, magar KON ne di,
    yeh kabhi public nahi hona chahiye.

    Is liye course/semester ka label sirf tab dikhta hai jab us jorey par kam se
    kam 3 published reviews mojood hon. Isi tarah course/semester ka FILTER bhi
    sirf ussi soorat me chalta hai: chhote bucket par filter hamesha khali
    jawab deta hai, chahe review mojood ho ya na ho. Dono halat ka jawab ek
    jaisa hai, is liye filter se bhi kuch maloom nahi hota.

    Yeh sirf LABEL chhupata hai. Rating aur text wese hi public rehte hain.
  */
  with base as (
    select
      r.id,
      r.overall_rating,
      r.comment,
      r.moderation_status,
      r.is_featured,
      r.edit_count,
      r.created_at,
      r.updated_at,
      r.course_id,
      r.semester_id,
      count(*) over (partition by r.course_id, r.semester_id) as bucket_size
    from public.reviews r
    join public.people p on p.id = r.person_id and p.is_active
    where r.person_id = p_person_id
      and r.status = 'published'
  )
  select
    b.id,
    b.overall_rating,
    -- YAHI woh jagah hai jahan §22 lagta hai: bina approval ke text null hai.
    case when b.moderation_status = 'approved' then b.comment end,
    b.is_featured,
    b.edit_count > 0,
    b.created_at,
    b.updated_at,
    case when b.bucket_size >= 3 then c.code  end,
    case when b.bucket_size >= 3 then c.title end,
    case when b.bucket_size >= 3 then s.label end,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'key',   cr.key,
            'label', cr.label,
            'kind',  cr.kind,
            'star',  a.star_value,
            'yes',   a.bool_value
          )
          order by cr.sort_order
        ),
        '[]'::jsonb
      )
      from public.review_answers a
      join public.review_criteria cr on cr.id = a.criterion_id
      where a.review_id = b.id
    ),
    -- Window function LIMIT se pehle chalta hai, is liye yeh poora total deta hai.
    count(*) over ()
  from base b
  left join public.courses   c on c.id = b.course_id
  left join public.semesters s on s.id = b.semester_id
  where (not p_featured_only or b.is_featured)
    and (p_course_id   is null or (b.course_id   = p_course_id   and b.bucket_size >= 3))
    and (p_semester_id is null or (b.semester_id = p_semester_id and b.bucket_size >= 3))
  order by
    case when p_oldest_first then b.created_at end asc,
    case when p_oldest_first then null else b.created_at end desc,
    b.id
  -- Client jo bhi bheje, page ki lambai yahan band hai. README §23: kabhi
  -- saari reviews ek saath browser me mat bhejo.
  limit  least(greatest(coalesce(p_limit, 10), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

comment on function public.person_reviews(uuid, int, int, boolean, boolean, uuid, uuid) is
  'Public review list: page, featured, course/semester filter. Text sirf approved hone par aata hai.';

-- -----------------------------------------------------------------------------
drop function if exists public.my_review_for_person(uuid);

-- p_course_id / p_semester_id null hon to "is banday par meri sab se nai
-- review" milti hai. Wajah: profile page par form khulte waqt abhi course chuna
-- hi nahi gaya hota.
create function public.my_review_for_person(
  p_person_id   uuid,
  p_course_id   uuid default null,
  p_semester_id uuid default null
)
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
  course_id         uuid,
  course_code       text,
  course_title      text,
  semester_id       uuid,
  semester_label    text,
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
    r.course_id,
    c.code,
    c.title,
    r.semester_id,
    s.label,
    (
      select coalesce(
        jsonb_object_agg(
          cr.key,
          jsonb_build_object('star', a.star_value, 'yes', a.bool_value)
        ),
        '{}'::jsonb
      )
      from public.review_answers a
      join public.review_criteria cr on cr.id = a.criterion_id
      where a.review_id = r.id
    )
  from public.review_authors ra
  join public.reviews r on r.id = ra.review_id
  join public.people  p on p.id = r.person_id
  left join public.courses   c on c.id = r.course_id
  left join public.semesters s on s.id = r.semester_id
  where ra.author_id = auth.uid()
    and ra.person_id = p_person_id
    and r.status <> 'removed'
    and (p_course_id   is null or ra.course_id   = p_course_id)
    and (p_semester_id is null or ra.semester_id = p_semester_id)
  order by r.created_at desc
  limit 1;
$$;

comment on function public.my_review_for_person(uuid, uuid, uuid) is
  'Apni review is banday par (course/semester se scope ki ja sakti hai). Apna text hamesha dikhta hai.';

-- -----------------------------------------------------------------------------
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
  updated_at        timestamptz,
  course_id         uuid,
  course_code       text,
  course_title      text,
  semester_id       uuid,
  semester_label    text
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
    r.course_id,
    c.code,
    c.title,
    r.semester_id,
    s.label
  from public.review_authors ra
  join public.reviews r on r.id = ra.review_id
  join public.people  p on p.id = r.person_id
  left join public.courses   c on c.id = r.course_id
  left join public.semesters s on s.id = r.semester_id
  where ra.author_id = auth.uid()
    and r.status <> 'removed'
  order by r.created_at desc;
$$;

comment on function public.my_reviews() is
  'Sirf current user ki apni reviews: moderation ki halat aur course/semester ke saath.';

-- -----------------------------------------------------------------------------
-- my_reviewed_person_ids ab kaafi nahi raha: ek hi banday par kai reviews
-- mumkin hain. Button ka text theek rakhne ke liye scope-wise list chahiye.
create or replace function public.my_review_scopes()
returns table (
  person_id   uuid,
  course_id   uuid,
  semester_id uuid
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- Status ki chhanti JAAN BOOJH KAR nahi hai. Unique index `review_authors`
  -- par hai, aur delete soft hai (row rehti hai) — is liye delete ki hui review
  -- ka scope bhi ab tak "istemal shuda" hai. Agar yahan removed ko nikal dein
  -- to form dobara wahi option dikhata aur DB submit par rad kar deti.
  select ra.person_id, ra.course_id, ra.semester_id
    from public.review_authors ra
   where ra.author_id = auth.uid();
$$;

comment on function public.my_review_scopes() is
  'Kis person+course+semester par meri review pehle se hai (UI ke button ke liye).';

-- =============================================================================
-- 7) Admin queue me bhi context
-- =============================================================================
drop function if exists public.admin_review_queue(public.review_moderation_status, int, int);

create function public.admin_review_queue(
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
  course_title   text,
  semester_label text,
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
      c.title,
      s.label,
      r.created_at,
      count(*) over ()
    from public.reviews r
    join public.people p on p.id = r.person_id
    left join public.courses   c on c.id = r.course_id
    left join public.semesters s on s.id = r.semester_id
    where r.moderation_status = p_status
      and r.status <> 'removed'
    order by r.created_at asc, r.id
    limit  least(greatest(coalesce(p_limit, 20), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

comment on function public.admin_review_queue(public.review_moderation_status, int, int) is
  'Admin ka moderation queue with course/semester context. Author ka naam yahan bhi nahi aata.';

-- =============================================================================
-- 8) Grants — STANDING RULE: pehle public/anon se sab chheeno, phir do
-- =============================================================================
revoke all on function public.person_review_options(uuid)                                   from public, anon, authenticated;
revoke all on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid)        from public, anon, authenticated;
revoke all on function public.person_reviews(uuid, int, int, boolean, boolean, uuid, uuid)  from public, anon, authenticated;
revoke all on function public.my_review_for_person(uuid, uuid, uuid)                        from public, anon, authenticated;
revoke all on function public.my_reviews()                                                  from public, anon, authenticated;
revoke all on function public.my_review_scopes()                                            from public, anon, authenticated;
revoke all on function public.admin_review_queue(public.review_moderation_status, int, int) from public, anon, authenticated;

-- person_reviews public list hai, is liye anon ko bhi chahiye.
grant execute on function public.person_reviews(uuid, int, int, boolean, boolean, uuid, uuid) to anon, authenticated;
-- Baqi sab sirf signed-in ke liye. Andar phir bhi apna apna taala hai.
grant execute on function public.person_review_options(uuid)                            to authenticated;
grant execute on function public.submit_review(uuid, smallint, text, jsonb, uuid, uuid) to authenticated;
grant execute on function public.my_review_for_person(uuid, uuid, uuid)                 to authenticated;
grant execute on function public.my_reviews()                                           to authenticated;
grant execute on function public.my_review_scopes()                                     to authenticated;
grant execute on function public.admin_review_queue(public.review_moderation_status, int, int) to authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * Ek student usi teacher ko alag course ya alag semester me dobara review
--     kar sakta hai; wohi course + wohi semester dobara nahi.
--   * Staff/HR par uniqueness student + person + category + semester hai.
--   * Rule ka asli taala do partial unique indexes hain, function nahi.
--   * Purani reviews (bina course/semester) waise ki waise mehfooz hain.
--   * Course sirf teacher/lab_instructor reviews par lag sakta hai.
--   * Public list course/semester se filter ho sakti hai.
-- =============================================================================
