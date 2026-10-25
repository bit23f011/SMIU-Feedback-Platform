begin;

-- Normalize spelling, punctuation and common titles before matching each word.
create or replace function public.normalize_people_search(p_text text)
returns text language sql immutable parallel safe
set search_path = public, pg_temp
as $$
  select btrim(regexp_replace(regexp_replace(
    regexp_replace(lower(translate(coalesce(p_text, ''), '''’`', '')), '[^[:alnum:]]+', ' ', 'g'),
    '\m(mam|maam|madam|miss|ms|mrs)\M', 'maam', 'g'),
    '\m(mr|mister|sir)\M', 'sir', 'g'));
$$;

create or replace function public.person_matches_search(p_person_id uuid, p_search text)
returns boolean language sql stable security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.people p
    left join lateral (
      select string_agg(concat_ws(' ', pr.category::text, pr.title_override,
        pos.title, d.name, d.short_name), ' ') as role_text
      from public.person_roles pr
      left join public.positions pos on pos.id = pr.position_id
      left join public.departments d on d.id = pr.department_id and d.is_active
      where pr.person_id = p.id and pr.is_active
    ) roles on true
    where p.id = p_person_id and p.is_active
      and not exists (
        select 1
        from regexp_split_to_table(public.normalize_people_search(left(coalesce(p_search, ''), 80)), ' +') word
        where word <> '' and strpos(public.normalize_people_search(concat_ws(' ',
          p.full_name, p.display_name, p.headline, roles.role_text,
          case p.gender when 'female' then 'maam' when 'male' then 'sir' else '' end)), word) = 0
      )
  );
$$;

create or replace function public.search_all_people(
  p_search text default null, p_limit int default 24, p_offset int default 0
)
returns table (
  id uuid, slug text, full_name text, display_name text, gender public.person_gender,
  photo_url text, headline text, primary_category public.person_category,
  teacher_type public.teacher_type, person_roles jsonb, total_count bigint
)
language sql stable security invoker
set search_path = public, pg_temp
as $$
  select p.id, p.slug, p.full_name, p.display_name, p.gender, p.photo_url,
    p.headline, p.primary_category, p.teacher_type, roles.items, count(*) over ()
  from public.people p
  join lateral (
    select jsonb_agg(jsonb_build_object(
      'category', pr.category, 'title_override', pr.title_override,
      'is_primary', pr.is_primary, 'is_active', pr.is_active,
      'positions', case when pos.id is null then null else jsonb_build_object('title', pos.title) end,
      'departments', case when d.id is null then null else jsonb_build_object('name', d.name, 'short_name', d.short_name) end
    ) order by pr.is_primary desc, pr.created_at, pr.id) as items
    from public.person_roles pr
    left join public.positions pos on pos.id = pr.position_id
    left join public.departments d on d.id = pr.department_id and d.is_active
    where pr.person_id = p.id and pr.is_active
    having count(*) > 0
  ) roles on true
  where p.is_active and public.person_matches_search(p.id, p_search)
  order by p.full_name, p.id
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.normalize_people_search(text) from public;
revoke all on function public.person_matches_search(uuid, text) from public;
revoke all on function public.search_all_people(text, int, int) from public;
grant execute on function public.normalize_people_search(text), public.person_matches_search(uuid, text), public.search_all_people(text, int, int) to anon, authenticated;

-- Historical reviews survive a course merge, including two reviews from the
-- same student for formerly separate course IDs. New submissions still check
-- every existing scope and are protected by the unique index.
alter table public.review_authors add column if not exists merged_course_duplicate boolean not null default false;
drop index if exists public.review_authors_course_scope_idx;
create unique index review_authors_course_scope_idx
  on public.review_authors (author_id, person_id, course_id, semester_id)
  where course_id is not null and not merged_course_duplicate;

create or replace function public.admin_delete_duplicate_courses()
returns int language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_group record;
  v_duplicate uuid;
  v_offering record;
  v_target_offering uuid;
  v_deleted int := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  -- Serialize inserts/reviews with cleanup so references cannot change halfway.
  lock table public.courses, public.course_offerings, public.teacher_assignments,
    public.reviews, public.review_authors in share row exclusive mode;

  for v_group in
    select array_agg(c.id order by c.is_active desc, c.created_at, c.id) as ids
    from public.courses c
    group by coalesce(nullif(btrim(regexp_replace(lower(c.title), '[^[:alnum:]]+', ' ', 'g')), ''), lower(btrim(c.title)))
    having count(*) > 1
  loop
    foreach v_duplicate in array v_group.ids[2:array_length(v_group.ids, 1)] loop
      -- Mark only conflicting historical authorships before moving references.
      update public.review_authors ra set merged_course_duplicate = true
      where ra.course_id = v_duplicate and exists (
        select 1 from public.review_authors kept
        where kept.course_id = v_group.ids[1]
          and kept.author_id = ra.author_id and kept.person_id = ra.person_id
          and kept.semester_id is not distinct from ra.semester_id
      );
      update public.review_authors set course_id = v_group.ids[1] where course_id = v_duplicate;
      update public.reviews set course_id = v_group.ids[1] where course_id = v_duplicate;

      for v_offering in select * from public.course_offerings where course_id = v_duplicate loop
        select co.id into v_target_offering from public.course_offerings co
        where co.course_id = v_group.ids[1] and co.semester_id = v_offering.semester_id
          and co.section is not distinct from v_offering.section;
        if v_target_offering is null then
          update public.course_offerings set course_id = v_group.ids[1] where id = v_offering.id;
        else
          insert into public.teacher_assignments (person_id, course_offering_id, category, is_active)
          select ta.person_id, v_target_offering, ta.category, ta.is_active
          from public.teacher_assignments ta where ta.course_offering_id = v_offering.id
          on conflict (person_id, course_offering_id) do update
            set is_active = public.teacher_assignments.is_active or excluded.is_active;
          update public.course_offerings set is_active = is_active or v_offering.is_active where id = v_target_offering;
          delete from public.course_offerings where id = v_offering.id;
        end if;
      end loop;
      delete from public.courses where id = v_duplicate;
      v_deleted := v_deleted + 1;
    end loop;
  end loop;

  insert into public.admin_audit_log (actor_id, action, entity_type, details)
  values (auth.uid(), 'courses.delete_duplicates', 'course', jsonb_build_object('deleted', v_deleted));
  return v_deleted;
end;
$$;
revoke all on function public.admin_delete_duplicate_courses() from public, anon;
grant execute on function public.admin_delete_duplicate_courses() to authenticated;

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
        or public.person_matches_search(p.id, pm.term)
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

commit;
