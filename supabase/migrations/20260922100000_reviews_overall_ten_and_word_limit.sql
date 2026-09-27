-- =============================================================================
-- 20260922100000_reviews_overall_ten_and_word_limit.sql
--
-- Phase 3 continuation. Do cheezein README ke mutabiq theek karta hai:
--
--   1) README §15-§19: Overall rating 1-10 hai, 1-5 nahi. Table ka check,
--      dono write functions, aur summary view teeno 1-10 par aa rahe hain.
--
--   2) README §21: comment ki had 150 WORDS hai, characters nahi. Limit client
--      aur server DONO par lagti hai. Server yahan do jagah lagata hai: table ka
--      CHECK constraint (aakhri deewar) aur function ka friendly error.
--
-- SAFETY:
--   * Koi table drop nahi, koi review delete nahi, koi migration dobara nahi
--     chalti. Sab kuch guarded aur idempotent hai.
--   * Purane 1-5 wale reviews ko 1-10 par lana zaroori hai, warna 4/5 wala
--     review achanak 4/10 (yani bura) parha jane lagta. Linear map use kiya hai:
--     nayi value = purani * 2. Yeh sirf USI soorat me chalta hai jab purani
--     1-5 wali constraint abhi mojood ho, is liye dobara chalne par double
--     nahi hoga.
--   * Functions `create or replace` hoti hain, is liye purane grants qayam
--     rehte hain. Phir bhi standing rule ke mutabiq neeche grants dobara saaf
--     saaf likhe gaye hain.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) overall_rating: 1-5  ->  1-10 (purana data rescale ke saath)
-- -----------------------------------------------------------------------------
do $$
declare
  v_constraint text;
begin
  -- Purani inline check constraint ka asli naam dhoondo (hardcode nahi karte).
  select con.conname into v_constraint
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
   where ns.nspname = 'public'
     and rel.relname = 'reviews'
     and con.contype = 'c'
     and pg_get_constraintdef(con.oid) ilike '%overall_rating%'
     and pg_get_constraintdef(con.oid) like '%5%'
   limit 1;

  if v_constraint is not null then
    -- Pehle constraint hatao, phir data rescale karo, phir nayi constraint.
    execute format('alter table public.reviews drop constraint %I', v_constraint);

    update public.reviews
       set overall_rating = (overall_rating * 2)::smallint
     where overall_rating between 1 and 5;

    raise notice 'overall_rating 1-5 se 1-10 par shift ho gaya (purane rows *2).';
  end if;
end
$$;

alter table public.reviews
  drop constraint if exists reviews_overall_rating_range;

alter table public.reviews
  add constraint reviews_overall_rating_range
  check (overall_rating between 1 and 10);

comment on column public.reviews.overall_rating is
  'Overall rating 1-10 (README §15). Criteria ke stars alag hain, wo 1-5 hain.';

-- -----------------------------------------------------------------------------
-- 2) comment: character limit  ->  150 WORD limit
--
--    char_length ki upar wali had (1500) jaan boojh kar rakhi hai: 150 "words"
--    ki aar me koi ek 2 MB ka lafz na bhej de. Word count ke liye
--    regexp_split_to_array immutable hai, is liye CHECK me chal sakta hai.
-- -----------------------------------------------------------------------------
do $$
declare
  v_constraint text;
begin
  select con.conname into v_constraint
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
   where ns.nspname = 'public'
     and rel.relname = 'reviews'
     and con.contype = 'c'
     and pg_get_constraintdef(con.oid) ilike '%comment%'
     and pg_get_constraintdef(con.oid) ilike '%char_length%'
   limit 1;

  if v_constraint is not null then
    execute format('alter table public.reviews drop constraint %I', v_constraint);
  end if;
end
$$;

alter table public.reviews
  drop constraint if exists reviews_comment_word_limit;

alter table public.reviews
  add constraint reviews_comment_word_limit
  check (
    comment is null
    or (
      char_length(btrim(comment)) between 1 and 1500
      and coalesce(
            array_length(regexp_split_to_array(btrim(comment), '\s+'), 1),
            0
          ) between 1 and 150
    )
  );

comment on column public.reviews.comment is
  'Optional plain text, max 150 words (README §21). HTML kabhi render nahi hota - React text node me jata hai.';

-- -----------------------------------------------------------------------------
-- 3) person_rating_stats: 5 buckets -> 10 buckets
--    security_invoker = on wapas lagana ZAROORI hai. Bhool jayein to view ek
--    chupa hua SECURITY DEFINER ban jata hai aur RLS bypass ho jati hai.
-- -----------------------------------------------------------------------------
create or replace view public.person_rating_stats
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
-- 4) submit_review — overall 1-10 + 150 word server check
-- -----------------------------------------------------------------------------
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

  -- README §15: overall 1-10.
  if p_overall is null or p_overall < 1 or p_overall > 10 then
    raise exception 'Give an overall rating between 1 and 10.' using errcode = 'check_violation';
  end if;

  v_comment := nullif(btrim(coalesce(p_comment, '')), '');

  -- README §21: 150 word limit SERVER par. Client ka counter sirf madad ke liye hai.
  if v_comment is not null then
    v_words := coalesce(array_length(regexp_split_to_array(v_comment, '\s+'), 1), 0);
    if v_words > 150 then
      raise exception 'Keep your comment to 150 words or fewer.' using errcode = 'check_violation';
    end if;
    if char_length(v_comment) > 1500 then
      raise exception 'Your comment is too long. Please shorten it.' using errcode = 'check_violation';
    end if;
  end if;

  insert into public.reviews (person_id, category, overall_rating, comment)
  values (p_person_id, v_category, p_overall, v_comment)
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
  'Naya review. Verified student, ek banday par ek review, daily limit, overall 1-10, 150 word limit, poore answers - sab yahin check hote hain.';

-- -----------------------------------------------------------------------------
-- 5) update_my_review — wahi do rules
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
  v_words     int;
  v_expected  int;
  v_inserted  int;
begin
  if v_uid is null or not public.is_verified_student() then
    raise exception 'Your account cannot edit reviews.' using errcode = 'insufficient_privilege';
  end if;

  select r.category, r.edit_count into v_category, v_edits
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
  'Apni review edit karo. Edit limit, overall 1-10, aur 150 word limit sab yahin check hote hain.';

-- -----------------------------------------------------------------------------
-- 6) Grants dobara saaf saaf. (create or replace grants nahi mitata, magar
--    standing rule yehi hai ke har function ka grant explicit ho.)
-- -----------------------------------------------------------------------------
revoke all on function public.submit_review(uuid, smallint, text, jsonb)    from public, anon, authenticated;
revoke all on function public.update_my_review(uuid, smallint, text, jsonb) from public, anon, authenticated;

grant execute on function public.submit_review(uuid, smallint, text, jsonb)    to authenticated;
grant execute on function public.update_my_review(uuid, smallint, text, jsonb) to authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * Overall rating har jagah 1-10 hai: table check, dono functions, aur view.
--   * Purane 1-5 reviews ko *2 kar diya gaya taake unka matlab na badle.
--   * Comment ki had 150 words hai, table CHECK aur function dono me.
--   * person_rating_stats ab count_1 se count_10 deta hai (security_invoker=on).
--   * Koi nayi function nahi bani; jo replace hui unke grants explicit hain.
-- =============================================================================
