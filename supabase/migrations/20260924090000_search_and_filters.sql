-- =============================================================================
-- ProfAura Phase 4 (A) - Public search + trusted filters (README §34, §35, §84)
-- =============================================================================
-- MAQSAD:
--   §34: naam se aur course se search. Case-insensitive, partial match, indexed,
--        paginated, injection se mehfooz.
--   §35: filters - category, department, course, semester, rating, teacher type.
--        "Arbitrary client-supplied ordering/filter fields must not be trusted."
--   §84: pagination, efficient queries, koi N+1 nahi, poori list kabhi nahi.
--
-- ASOOL:
--   1. SORT ka naam client se aata hai magar us par BHAROSA nahi kiya jata. Yahan
--      ek chhoti si allow-list hai; jo us me nahi, wo chup chaap 'name' ban jata
--      hai. Column naam kabhi string se nahi jorha jata, is liye order-by
--      injection ka raasta hi mojood nahi.
--   2. Yeh functions SECURITY INVOKER hain (default). Matlab caller ki RLS lagti
--      hai. Hum ne RLS ko na bypass kiya hai na dobara likha hai. person profile
--      ki visibility wahi rehti hai jo policy kehti hai.
--   3. Search term ko LIKE pattern banate waqt % _ \ escape hote hain, warna user
--      ka `%` wildcard ban jata aur natija be-tuka hota.
--
-- DATA SAFETY (§27):
--   Poori tarah additive. Sirf do naye read-only functions aur do indexes. Koi
--   table, column, row, policy ya grant nahi badla gaya.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Trigram indexes - taake `ilike '%term%'` par bhi index chale
-- -----------------------------------------------------------------------------
/*
  pg_trgm Supabase par aam tor par `extensions` schema me hota hai, magar har DB
  par nahi. Is liye pehle dekhte hain ke extension kahan hai, phir usi schema ka
  operator class use karte hain. Agar extension kisi wajah se available na ho to
  migration girti NAHI: search phir bhi sahi chalti hai, bas sequential scan par.
  Correctness pehle, raftaar uske baad.
*/
do $$
declare
  v_schema text;
begin
  select n.nspname
    into v_schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'pg_trgm';

  if v_schema is null then
    begin
      if exists (select 1 from pg_namespace where nspname = 'extensions') then
        execute 'create extension if not exists pg_trgm with schema extensions';
      else
        execute 'create extension if not exists pg_trgm';
      end if;

      select n.nspname
        into v_schema
        from pg_extension e
        join pg_namespace n on n.oid = e.extnamespace
       where e.extname = 'pg_trgm';
    exception when others then
      raise notice 'pg_trgm could not be installed: %', sqlerrm;
      v_schema := null;
    end;
  end if;

  if v_schema is null then
    raise notice 'Search will work without a trigram index. Install pg_trgm later for speed.';
    return;
  end if;

  /*
    Index usi EXPRESSION par hai jis par query match karti hai. Dono immutable
    hain (|| aur coalesce), is liye expression index banta hai.
  */
  execute format(
    $q$create index if not exists people_search_trgm_idx
         on public.people
      using gin ((full_name || ' ' || coalesce(display_name, '')) %I.gin_trgm_ops)$q$,
    v_schema
  );

  execute format(
    $q$create index if not exists courses_search_trgm_idx
         on public.courses
      using gin ((title || ' ' || coalesce(code, '')) %I.gin_trgm_ops)$q$,
    v_schema
  );
end
$$;

-- -----------------------------------------------------------------------------
-- 2) directory_people - ek query me search + filters + sort + total count
-- -----------------------------------------------------------------------------
/*
  Ek hi round trip me rows AUR total count dono aate hain: `count(*) over ()`
  LIMIT se PEHLE compute hota hai, is liye pagination ke liye doosri COUNT query
  ki zaroorat nahi rehti (§84).

  Rating `person_rating_stats` view se aati hai jo khud security_invoker hai, is
  liye yahan bhi RLS ka rasta wahi rehta hai.
*/
create or replace function public.directory_people(
  p_category      public.person_category,
  p_search        text                 default null,
  p_department_id uuid                 default null,
  p_course_id     uuid                 default null,
  p_semester_id   uuid                 default null,
  p_min_rating    numeric              default null,
  p_teacher_type  public.teacher_type  default null,
  p_sort          text                 default 'name',
  p_limit         int                  default 24,
  p_offset        int                  default 0
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
  teacher_type     public.teacher_type,
  role_title       text,
  department_name  text,
  department_short text,
  average_rating   numeric,
  review_count     int,
  total_count      bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with params as (
    select
      nullif(btrim(coalesce(p_search, '')), '')      as term,
      -- ALLOW-LIST. Jo is me nahi, wo 'name' hai. Client ka bheja hua column
      -- naam kabhi order by tak nahi pohnchta.
      case lower(btrim(coalesce(p_sort, 'name')))
        when 'rating'  then 'rating'
        when 'reviews' then 'reviews'
        when 'recent'  then 'recent'
        else 'name'
      end                                            as sort_key,
      case
        when p_min_rating is null then null
        else least(greatest(p_min_rating, 1), 10)
      end                                            as min_rating,
      least(greatest(coalesce(p_limit, 24), 1), 60)  as row_limit,
      greatest(coalesce(p_offset, 0), 0)             as row_offset
  ),
  matched as (
    select
      p.id,
      p.slug,
      p.full_name,
      p.display_name,
      p.gender,
      p.photo_url,
      p.headline,
      p.primary_category,
      p.teacher_type,
      p.created_at,
      coalesce(pos.title, pr.title_override) as role_title,
      d.name                                 as department_name,
      d.short_name                           as department_short,
      st.average_rating                      as average_rating,
      coalesce(st.review_count, 0)           as review_count,
      pm.sort_key                            as sort_key,
      pm.row_limit                           as row_limit,
      pm.row_offset                          as row_offset
    from params pm
    cross join public.people p
    /*
      LATERAL + limit 1: ek person ke do active role ek hi category me ho sakte
      hain (do alag department). Bina is ke wo person list me do baar aata aur
      total count bhi jhoota hota. Primary role ko tarjeeh, warna sab se purana.
      Koi role match na kare to yeh join row hi nahi deta, yani filter ban jata hai.
    */
    join lateral (
      select pr.title_override, pr.position_id, pr.department_id
        from public.person_roles pr
       where pr.person_id = p.id
         and pr.category  = p_category
         and pr.is_active
         and (p_department_id is null or pr.department_id = p_department_id)
       order by pr.is_primary desc, pr.created_at asc
       limit 1
    ) pr on true
    left join public.positions          pos on pos.id = pr.position_id
    left join public.departments        d   on d.id   = pr.department_id and d.is_active
    left join public.person_rating_stats st  on st.person_id = p.id
    where p.is_active
      and (
        pm.term is null
        or (p.full_name || ' ' || coalesce(p.display_name, ''))
             ilike '%' || replace(replace(replace(pm.term, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      )
      and (p_teacher_type is null or p.teacher_type = p_teacher_type)
      and (pm.min_rating  is null or st.average_rating >= pm.min_rating)
      and (
        (p_course_id is null and p_semester_id is null)
        or exists (
          /*
            Course/semester filter offerings se aata hai. Yahan courses aur
            departments ko is_active se join karna zaroori hai taake yeh filter
            wahi rows de jo `courses` ki RLS bhi deti hai.
          */
          select 1
            from public.teacher_assignments ta
            join public.course_offerings co on co.id = ta.course_offering_id and co.is_active
            join public.courses          c  on c.id  = co.course_id         and c.is_active
            join public.departments      cd on cd.id = c.department_id      and cd.is_active
           where ta.person_id = p.id
             and ta.is_active
             and (p_course_id   is null or co.course_id   = p_course_id)
             and (p_semester_id is null or co.semester_id = p_semester_id)
        )
      )
  )
  select
    m.id,
    m.slug,
    m.full_name,
    m.display_name,
    m.gender,
    m.photo_url,
    m.headline,
    m.primary_category,
    m.teacher_type,
    m.role_title,
    m.department_name,
    m.department_short,
    m.average_rating,
    m.review_count,
    count(*) over () as total_count
  from matched m
  /*
    Har sort ka apna CASE hai. Jab sort_key match na kare to wo expression NULL
    rehta hai aur order par koi asar nahi daalta. Aakhir me full_name + id
    hamesha lagta hai, is liye tarteeb hamesha deterministic hai: do page kabhi
    ek hi row do dafa nahi dikhate.
  */
  order by
    case when m.sort_key = 'rating'  then m.average_rating end desc nulls last,
    case when m.sort_key = 'rating'  then m.review_count   end desc nulls last,
    case when m.sort_key = 'reviews' then m.review_count   end desc nulls last,
    case when m.sort_key = 'reviews' then m.average_rating end desc nulls last,
    case when m.sort_key = 'recent'  then m.created_at     end desc nulls last,
    m.full_name asc,
    m.id asc
  limit  (select row_limit  from params)
  offset (select row_offset from params);
$$;

comment on function public.directory_people(
  public.person_category, text, uuid, uuid, uuid, numeric, public.teacher_type, text, int, int
) is
  'Public directory search + filters (README §34, §35). Security invoker, is liye RLS caller par lagti hai. Sort ek allow-list se guzarta hai.';

-- -----------------------------------------------------------------------------
-- 3) directory_courses - course search (README §34)
-- -----------------------------------------------------------------------------
/*
  Course search ka natija course rows hai, aur har row ke saath un teachers ki
  ginti jo yeh course parha chuke hain. Teacher ke naam alag function se aate
  hain (§84: ek hi page par sab kuch load nahi karte).
*/
create or replace function public.directory_courses(
  p_search        text default null,
  p_department_id uuid default null,
  p_semester_id   uuid default null,
  p_limit         int  default 24,
  p_offset        int  default 0
)
returns table (
  course_id        uuid,
  slug             text,
  code             text,
  title            text,
  credit_hours     numeric,
  department_name  text,
  department_short text,
  teacher_count    int,
  total_count      bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with params as (
    select
      nullif(btrim(coalesce(p_search, '')), '')      as term,
      least(greatest(coalesce(p_limit, 24), 1), 60)  as row_limit,
      greatest(coalesce(p_offset, 0), 0)             as row_offset
  ),
  matched as (
    select
      c.id,
      c.slug,
      c.code,
      c.title,
      c.credit_hours,
      d.name       as department_name,
      d.short_name as department_short,
      (
        select count(distinct ta.person_id)::int
          from public.teacher_assignments ta
          join public.course_offerings co on co.id = ta.course_offering_id and co.is_active
          join public.people pe           on pe.id = ta.person_id          and pe.is_active
         where co.course_id = c.id
           and ta.is_active
           and (p_semester_id is null or co.semester_id = p_semester_id)
      ) as teacher_count
    from params pm
    cross join public.courses c
    join public.departments d on d.id = c.department_id and d.is_active
    where c.is_active
      and (p_department_id is null or c.department_id = p_department_id)
      and (
        pm.term is null
        or (c.title || ' ' || coalesce(c.code, ''))
             ilike '%' || replace(replace(replace(pm.term, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      )
      and (
        p_semester_id is null
        or exists (
          select 1
            from public.course_offerings co
           where co.course_id = c.id
             and co.semester_id = p_semester_id
             and co.is_active
        )
      )
  )
  select
    m.id,
    m.slug,
    m.code,
    m.title,
    m.credit_hours,
    m.department_name,
    m.department_short,
    m.teacher_count,
    count(*) over () as total_count
  from matched m
  order by m.title asc, m.id asc
  limit  (select row_limit  from params)
  offset (select row_offset from params);
$$;

comment on function public.directory_courses(text, uuid, uuid, int, int) is
  'Public course search (README §34). Har row ke saath us course ko parhane walon ki ginti.';

-- -----------------------------------------------------------------------------
-- 4) Grants - STANDING RULE: pehle sab wapas, phir sirf jo chahiye
-- -----------------------------------------------------------------------------
revoke all on function public.directory_people(
  public.person_category, text, uuid, uuid, uuid, numeric, public.teacher_type, text, int, int
) from public, anon, authenticated;

revoke all on function public.directory_courses(text, uuid, uuid, int, int)
  from public, anon, authenticated;

-- Dono public read hain (search bina login ke chalti hai, README §34).
grant execute on function public.directory_people(
  public.person_category, text, uuid, uuid, uuid, numeric, public.teacher_type, text, int, int
) to anon, authenticated;

grant execute on function public.directory_courses(text, uuid, uuid, int, int)
  to anon, authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * Naam aur course dono search ho sakte hain, case-insensitive aur partial.
--   * Filters DB me lagte hain, browser me nahi. Client sirf values bhejta hai,
--     column naam nahi.
--   * Har page ek query me aata hai aur total count saath aata hai.
--   * Koi nayi cheez public read me shamil nahi hui jo pehle se public na thi.
-- =============================================================================
