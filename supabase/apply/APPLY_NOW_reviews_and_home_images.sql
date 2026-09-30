-- =============================================================================
-- APPLY NOW: reviews submit + homepage images (do live-DB fixes ek file me).
--
-- Yeh file un DONO errors ko theek karti hai jo abhi live site par aa rahe hain:
--   (A) Review submit -> "We could not save your review right now. Please try again"
--       + public profile par review counts/averages theek na dikhna.
--   (B) /admin/home-images -> "This list did not load. Nothing has changed..."
--
-- KAISE CHALAYEN (ek dafa):
--   Supabase Dashboard -> SQL Editor -> New query -> yeh POORA file paste -> Run.
--
-- MEHFOOZ HAI:
--   * Idempotent hai - dobara chala do to koi nuqsan nahi (sab if-exists / or-replace
--     / on-conflict).
--   * Koi mojooda table ya data ko haath nahi lagata. Sirf view/function refresh
--     karta hai aur home_images ka naya (additive) setup banata hai.
--
-- 3 ALAG TRANSACTIONS (jaan boojh kar alag):
--   PART 1  reviews repair          -> hamesha chal jata hai.
--   PART 2  home_images table+RPCs  -> hamesha chal jata hai (list yahin theek ho jati).
--   PART 3  storage bucket+policies -> agar "must be owner of table objects" error de,
--           to PART 1 & 2 phir bhi commit ho chuke honge (dono error theek).
--           Sirf image UPLOAD ke liye storage Dashboard se banana (neeche note).
-- =============================================================================


-- #############################################################################
-- PART 1 - REVIEWS: person_rating_stats (10 buckets) + submit_review (6-arg final)
-- #############################################################################
begin;

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


-- #############################################################################
-- PART 2 - HOME IMAGES: table + cap trigger + RLS + 3 admin RPCs
--          (Is part ke baad /admin/home-images ki list load ho jayegi.)
-- #############################################################################
begin;

create table if not exists public.home_images (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  alt_text     text,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);

comment on table public.home_images is
  'Homepage hero ki admin-managed images (max 15). Bytes storage bucket home-images me; yahan sirf metadata. Public sirf is_active parhta hai (RLS).';

drop trigger if exists home_images_set_updated_at on public.home_images;
create trigger home_images_set_updated_at
  before update on public.home_images
  for each row execute function public.set_updated_at();

create or replace function public.enforce_home_images_cap()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.home_images) >= 15 then
    raise exception 'You can add at most 15 homepage images.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.enforce_home_images_cap() is
  'BEFORE INSERT guard: home_images me 15 se ziyada rows nahi. Server-side hard cap.';

drop trigger if exists home_images_cap on public.home_images;
create trigger home_images_cap
  before insert on public.home_images
  for each row execute function public.enforce_home_images_cap();

alter table public.home_images enable row level security;

grant select on public.home_images to anon, authenticated;

drop policy if exists "public read active home images" on public.home_images;
create policy "public read active home images"
  on public.home_images for select
  to anon, authenticated
  using (is_active);

create or replace function public.admin_home_image_list()
returns table (
  id           uuid,
  storage_path text,
  alt_text     text,
  sort_order   integer,
  is_active    boolean,
  created_at   timestamptz
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
    select h.id, h.storage_path, h.alt_text, h.sort_order, h.is_active, h.created_at
    from public.home_images h
    order by h.sort_order, h.created_at, h.id;
end;
$$;

comment on function public.admin_home_image_list() is
  'Admin ko saari homepage images (inactive bhi), tarteeb se.';

create or replace function public.admin_add_home_image(
  p_storage_path text,
  p_alt_text     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_path text;
  v_alt  text;
  v_next integer;
  v_id   uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_path := nullif(btrim(coalesce(p_storage_path, '')), '');
  if v_path is null then
    raise exception 'An image is required.' using errcode = 'check_violation';
  end if;
  if v_path !~ '^[a-zA-Z0-9._-]+$' or char_length(v_path) > 200 then
    raise exception 'That image could not be saved.' using errcode = 'check_violation';
  end if;

  v_alt := nullif(btrim(coalesce(p_alt_text, '')), '');
  if v_alt is not null and char_length(v_alt) > 200 then
    raise exception 'Please keep the description shorter.' using errcode = 'check_violation';
  end if;

  if (select count(*) from public.home_images) >= 15 then
    raise exception 'You can add at most 15 homepage images.' using errcode = 'check_violation';
  end if;

  select coalesce(max(sort_order), 0) + 1 into v_next from public.home_images;

  insert into public.home_images (storage_path, alt_text, sort_order, created_by)
  values (v_path, v_alt, v_next, v_uid)
  returning id into v_id;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'home_image.create', 'home_image', v_id,
          jsonb_build_object('path', v_path));

  return v_id;
end;
$$;

comment on function public.admin_add_home_image(text, text) is
  'Homepage image ka metadata row add karo (bytes storage me pehle se). Cap 15, audit.';

create or replace function public.admin_delete_home_image(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_path text;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  delete from public.home_images
   where id = p_id
  returning storage_path into v_path;

  if v_path is null then
    raise exception 'That image is not available.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'home_image.delete', 'home_image', p_id,
          jsonb_build_object('path', v_path));

  return v_path;
end;
$$;

comment on function public.admin_delete_home_image(uuid) is
  'Homepage image metadata delete; storage_path wapas taake object bhi mit sake. Audit.';

revoke all on function public.enforce_home_images_cap()               from public, anon, authenticated;
revoke all on function public.admin_home_image_list()                 from public, anon, authenticated;
revoke all on function public.admin_add_home_image(text, text)        from public, anon, authenticated;
revoke all on function public.admin_delete_home_image(uuid)           from public, anon, authenticated;

grant execute on function public.admin_home_image_list()              to authenticated;
grant execute on function public.admin_add_home_image(text, text)     to authenticated;
grant execute on function public.admin_delete_home_image(uuid)        to authenticated;

commit;


-- #############################################################################
-- PART 3 - STORAGE bucket + policies (image UPLOAD ke liye).
--
-- Agar yeh part "must be owner of table objects" (ya milta julta) error de:
--   * GHABRAYEN NAHI - PART 1 & 2 upar pehle hi commit ho chuke hain, is liye
--     reviews aur home-images LIST dono theek ho gaye.
--   * Sirf UPLOAD enable karne ke liye Storage Dashboard se banayein:
--       1) Storage -> New bucket -> naam "home-images" -> Public bucket = ON.
--       2) Us bucket par 4 policies (Policies -> New policy -> custom):
--          - INSERT (to authenticated):  bucket_id = 'home-images' AND public.is_admin()
--          - UPDATE (to authenticated):  USING & WITH CHECK dono:
--                                         bucket_id = 'home-images' AND public.is_admin()
--          - DELETE (to authenticated):  bucket_id = 'home-images' AND public.is_admin()
--          - SELECT (to anon, authenticated): bucket_id = 'home-images'
-- #############################################################################
begin;

insert into storage.buckets (id, name, public)
values ('home-images', 'home-images', true)
on conflict (id) do nothing;

drop policy if exists "home-images admin insert" on storage.objects;
create policy "home-images admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'home-images' and public.is_admin());

drop policy if exists "home-images admin update" on storage.objects;
create policy "home-images admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'home-images' and public.is_admin())
  with check (bucket_id = 'home-images' and public.is_admin());

drop policy if exists "home-images admin delete" on storage.objects;
create policy "home-images admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'home-images' and public.is_admin());

drop policy if exists "home-images public read" on storage.objects;
create policy "home-images public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'home-images');

commit;

-- =============================================================================
-- TASDEEQ (alag se chala kar dekh lein, admin session me):
--   -- reviews:
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='person_rating_stats'
--    order by ordinal_position;                       -- count_1..count_10 hone chahiyen
--   -- home images:
--   select * from public.admin_home_image_list();     -- [] (khali, magar error nahi)
--   select id, public from storage.buckets where id = 'home-images';
-- =============================================================================
