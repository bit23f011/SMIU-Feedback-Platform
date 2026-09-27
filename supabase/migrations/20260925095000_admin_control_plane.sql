-- =============================================================================
-- 20260925095000_admin_control_plane.sql
--
-- Phase 5 DB C. Admin ka "control plane" - wo admin actions jo moderation ke
-- ird-gird hain:
--
--   1) NOTIFICATIONS (README §54): site_notifications par admin CRUD. Public read
--      policy pehle se schedule ke mutabiq auto activate/deactivate karti hai
--      (RLS 0002: is_active AND window). Yahan sirf admin ka likhne ka raasta.
--   2) REVIEW RESET (README §53): admin kisi person ka public review aggregate
--      reset kar sakta hai. Archival (status='removed'), delete NAHI. Reason
--      zaroori, audit hota hai. Aggregates live views hain (status='published'),
--      is liye reset ke foran baad 0 reviews / 0 rating.
--   3) DUPLICATE MERGE (README §52): do profile merge. Canonical rakho, duplicate
--      ke children safe tareeqe se canonical par le jao (double counting se
--      bacho), phir duplicate ko deactivate (archival). Audit.
--   4) FEATURE FLAG SETTER (README §55 ka write side): DB A ne feature_flags table
--      + feature_enabled() banaye the (read). Yahan admin ka set_feature_flag()
--      (write). Server-time schedule, audit.
--   5) CRITERIA EDITOR (README §49 "Review Criteria"): review_criteria par admin
--      upsert + list. Hard delete nahi (answers FK restrict); is_active=false se
--      archival.
--
-- SAFETY (README §27, §30):
--   * Koi table drop nahi, koi data destroy nahi. Reset/merge dono archival.
--   * Har function pehla kaam is_admin() check. Frontend button chhupana kaafi
--     nahi; ijazat yahin banti hai.
--   * Har function revoke-before-grant; sab authenticated ko (andar admin gate).
--   * Merge unique constraints ka ehtaram karta hai (review_authors author+person,
--     person_roles nulls-not-distinct + one-primary, teacher_assignments
--     person+offering, favorites/recently_viewed PK) - koi constraint violation
--     nahi, koi double count nahi.
-- =============================================================================

begin;

-- =============================================================================
-- 1) NOTIFICATIONS (README §54)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1a) admin_notification_list - admin sab notifications dekhta hai (inactive bhi,
--     public ke bar-aks). Newest pehle.
-- -----------------------------------------------------------------------------
create or replace function public.admin_notification_list(
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  id          uuid,
  title       text,
  message     text,
  priority    public.notification_priority,
  href        text,
  cta_label   text,
  is_active   boolean,
  starts_at   timestamptz,
  ends_at     timestamptz,
  is_live_now boolean,
  created_at  timestamptz,
  updated_at  timestamptz,
  total_count bigint
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
      n.id, n.title, n.message, n.priority, n.href, n.cta_label,
      n.is_active, n.starts_at, n.ends_at,
      -- Abhi public ko dikh raha hai ya nahi (wahi shart jo RLS read policy me).
      (n.is_active
        and (n.starts_at is null or n.starts_at <= now())
        and (n.ends_at   is null or n.ends_at   >= now())) as is_live_now,
      n.created_at, n.updated_at,
      count(*) over ()
    from public.site_notifications n
    order by n.created_at desc, n.id
    limit  least(greatest(coalesce(p_limit, 50), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

comment on function public.admin_notification_list(int, int) is
  'Admin ki notifications list (README §54). Inactive bhi dikhti hain + is_live_now flag.';

-- -----------------------------------------------------------------------------
-- 1b) admin_upsert_notification - p_id null = naya, warna update. Schedule ke
--     zariye khud activate/deactivate hoti hai (public read policy). Audit.
-- -----------------------------------------------------------------------------
create or replace function public.admin_upsert_notification(
  p_id        uuid,
  p_title     text,
  p_message   text,
  p_priority  public.notification_priority,
  p_href      text,
  p_cta_label text,
  p_is_active boolean,
  p_starts_at timestamptz,
  p_ends_at   timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_message text;
  v_title   text;
  v_href    text;
  v_cta     text;
  v_id      uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_message := nullif(btrim(coalesce(p_message, '')), '');
  if v_message is null then
    raise exception 'A message is required.' using errcode = 'check_violation';
  end if;
  if char_length(v_message) > 1000 then
    raise exception 'Please keep the message shorter.' using errcode = 'check_violation';
  end if;

  if p_starts_at is not null and p_ends_at is not null and p_ends_at < p_starts_at then
    raise exception 'The end time must be after the start time.' using errcode = 'check_violation';
  end if;

  v_title := nullif(btrim(coalesce(p_title, '')), '');
  v_href  := nullif(btrim(coalesce(p_href, '')), '');
  v_cta   := nullif(btrim(coalesce(p_cta_label, '')), '');

  if p_id is null then
    insert into public.site_notifications
      (title, message, priority, href, cta_label, is_active, starts_at, ends_at)
    values
      (v_title, v_message, coalesce(p_priority, 'info'), v_href, v_cta,
       coalesce(p_is_active, false), p_starts_at, p_ends_at)
    returning id into v_id;
  else
    update public.site_notifications
       set title     = v_title,
           message   = v_message,
           priority  = coalesce(p_priority, priority),
           href      = v_href,
           cta_label = v_cta,
           is_active = coalesce(p_is_active, is_active),
           starts_at = p_starts_at,
           ends_at   = p_ends_at
     where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'That notification is not available.' using errcode = 'no_data_found';
    end if;
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when p_id is null then 'notification.create' else 'notification.update' end,
    'site_notification',
    v_id,
    jsonb_build_object('isActive', coalesce(p_is_active, false), 'priority', coalesce(p_priority, 'info'))
  );

  return v_id;
end;
$$;

comment on function public.admin_upsert_notification(uuid, text, text, public.notification_priority, text, text, boolean, timestamptz, timestamptz) is
  'Notification banao/update karo (README §54). Schedule public read policy se lagti hai. Audit hota hai.';

-- -----------------------------------------------------------------------------
-- 1c) admin_delete_notification - notification hata do. Audit.
-- -----------------------------------------------------------------------------
create or replace function public.admin_delete_notification(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_hit int;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  delete from public.site_notifications where id = p_id;
  get diagnostics v_hit = row_count;

  if v_hit = 0 then
    raise exception 'That notification is not available.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'notification.delete', 'site_notification', p_id, null);
end;
$$;

comment on function public.admin_delete_notification(uuid) is
  'Notification delete (README §54). Audit hota hai.';

-- =============================================================================
-- 2) REVIEW RESET (README §53)
-- =============================================================================
-- Admin kisi person ki saari PUBLISHED reviews ko archive (status='removed') kar
-- deta hai. Delete NAHI (README §53: "prefer archival"). Aggregates live views
-- hain (status='published'), is liye foran 0 reviews / 0 rating. review_authors
-- rows rehti hain: yani jin students ne review ki thi, wo dobara usi banday ki
-- review nahi likh sakte (double-review guard qaim). "New eligible reviews" un
-- students se aa sakti hain jinhone abhi tak review nahi ki.
create or replace function public.admin_reset_person_reviews(
  p_person_id uuid,
  p_reason    text
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_reason text;
  v_count  int;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'A reason is required.' using errcode = 'check_violation';
  end if;
  if char_length(v_reason) > 1000 then
    raise exception 'Please keep the reason shorter.' using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.people where id = p_person_id) then
    raise exception 'That profile is not available.' using errcode = 'no_data_found';
  end if;

  -- Archival: published -> removed. is_featured bhi hata do.
  update public.reviews
     set status       = 'removed',
         is_featured  = false,
         updated_at   = now()
   where person_id = p_person_id
     and status = 'published';
  get diagnostics v_count = row_count;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    'reviews.reset',
    'person',
    p_person_id,
    jsonb_build_object('archived', v_count, 'reason', v_reason)
  );

  return v_count;
end;
$$;

comment on function public.admin_reset_person_reviews(uuid, text) is
  'Kisi person ki reviews reset karo (README §53). Archival (removed), delete nahi. Reason zaroori, audit. Aggregate foran 0.';

-- =============================================================================
-- 3) DUPLICATE MERGE (README §52)
-- =============================================================================
-- Duplicate ke children canonical par le jao, phir duplicate deactivate. Har
-- step unique constraint ka khayal rakhta hai taake na constraint toote na
-- rating double-count ho. Duplicate DELETE nahi hota (archival) - is liye jo
-- rows collision ki wajah se peechhe reh jayein wo bhi FK-safe rehti hain.
create or replace function public.admin_merge_people(
  p_canonical_id uuid,
  p_duplicate_id uuid,
  p_reason       text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_reason   text;
  v_moved    int := 0;
  v_archived int := 0;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  if p_canonical_id = p_duplicate_id then
    raise exception 'Choose two different profiles.' using errcode = 'check_violation';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'A reason is required.' using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.people where id = p_canonical_id) then
    raise exception 'The profile to keep is not available.' using errcode = 'no_data_found';
  end if;
  if not exists (select 1 from public.people where id = p_duplicate_id) then
    raise exception 'The duplicate profile is not available.' using errcode = 'no_data_found';
  end if;

  -- ---------------------------------------------------------------------------
  -- REVIEWS + review_authors. Double-count guard: agar ek hi author ne dono
  -- (canonical + duplicate) ko review kiya hai, to duplicate wali review ko
  -- ARCHIVE kar do (canonical par uski dobara ginti na ho). Baqi (non-colliding)
  -- published reviews canonical par shift ho jati hain.
  -- ---------------------------------------------------------------------------

  -- (a) Colliding published dup reviews -> removed. Yeh dup par hi rehti hain.
  update public.reviews r
     set status = 'removed', is_featured = false, updated_at = now()
    from public.review_authors ra
   where ra.review_id = r.id
     and r.person_id = p_duplicate_id
     and r.status = 'published'
     and exists (
       select 1 from public.review_authors ra2
        where ra2.author_id = ra.author_id
          and ra2.person_id = p_canonical_id
     );
  get diagnostics v_archived = row_count;

  -- (b) Non-colliding published dup reviews: author-mapping ko canonical par le
  --     jao (taake "ek banda ek review" canonical par bhi qaim rahe).
  update public.review_authors ra
     set person_id = p_canonical_id
    from public.reviews r
   where r.id = ra.review_id
     and ra.person_id = p_duplicate_id
     and r.status = 'published'
     and not exists (
       select 1 from public.review_authors ra2
        where ra2.author_id = ra.author_id
          and ra2.person_id = p_canonical_id
     );

  -- (c) Aur khud review row ka person_id canonical kar do (sirf abhi tak
  --     published; colliding to (a) me removed ho chuke, wo peechhe reh gaye).
  update public.reviews r
     set person_id = p_canonical_id, updated_at = now()
   where r.person_id = p_duplicate_id
     and r.status = 'published';
  get diagnostics v_moved = row_count;

  -- ---------------------------------------------------------------------------
  -- person_roles: non-colliding shift; moved roles ka is_primary false (canonical
  -- ka apna ek hi primary reh sake - one-primary partial unique).
  -- ---------------------------------------------------------------------------
  update public.person_roles pr
     set person_id = p_canonical_id, is_primary = false, updated_at = now()
   where pr.person_id = p_duplicate_id
     and not exists (
       select 1 from public.person_roles pr2
        where pr2.person_id = p_canonical_id
          and pr2.category = pr.category
          and pr2.department_id is not distinct from pr.department_id
          and pr2.position_id   is not distinct from pr.position_id
     );

  -- ---------------------------------------------------------------------------
  -- teacher_assignments: non-colliding (person_id, course_offering_id) shift.
  -- ---------------------------------------------------------------------------
  update public.teacher_assignments ta
     set person_id = p_canonical_id, updated_at = now()
   where ta.person_id = p_duplicate_id
     and not exists (
       select 1 from public.teacher_assignments ta2
        where ta2.person_id = p_canonical_id
          and ta2.course_offering_id = ta.course_offering_id
     );

  -- ---------------------------------------------------------------------------
  -- favorites / recently_viewed: PK (student_id, person_id). Jahan student ke
  -- paas canonical pehle se hai wahan dup wali giraa do, warna shift.
  -- ---------------------------------------------------------------------------
  delete from public.favorites f
   where f.person_id = p_duplicate_id
     and exists (
       select 1 from public.favorites f2
        where f2.student_id = f.student_id and f2.person_id = p_canonical_id
     );
  update public.favorites f
     set person_id = p_canonical_id
   where f.person_id = p_duplicate_id;

  delete from public.recently_viewed v
   where v.person_id = p_duplicate_id
     and exists (
       select 1 from public.recently_viewed v2
        where v2.student_id = v.student_id and v2.person_id = p_canonical_id
     );
  update public.recently_viewed v
     set person_id = p_canonical_id
   where v.person_id = p_duplicate_id;

  -- ---------------------------------------------------------------------------
  -- person_reports: non-pending sab shift; pending sirf wahan jahan reporter ka
  -- canonical par pehle se pending na ho (partial unique).
  -- ---------------------------------------------------------------------------
  update public.person_reports r
     set person_id = p_canonical_id
   where r.person_id = p_duplicate_id
     and r.status <> 'pending';

  update public.person_reports r
     set person_id = p_canonical_id
   where r.person_id = p_duplicate_id
     and r.status = 'pending'
     and not exists (
       select 1 from public.person_reports r2
        where r2.person_id = p_canonical_id
          and r2.reporter_id is not distinct from r.reporter_id
          and r2.status = 'pending'
     );

  -- ---------------------------------------------------------------------------
  -- Duplicate ko deactivate (archival, delete nahi). Ab public me nahi dikhega.
  -- ---------------------------------------------------------------------------
  update public.people set is_active = false, updated_at = now()
   where id = p_duplicate_id;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    'person.merge',
    'person',
    p_canonical_id,
    jsonb_build_object(
      'duplicate_id',     p_duplicate_id,
      'reviews_moved',    v_moved,
      'reviews_archived', v_archived,
      'reason',           v_reason
    )
  );
end;
$$;

comment on function public.admin_merge_people(uuid, uuid, text) is
  'Duplicate profile ko canonical me merge karo (README §52). Children safe shift, double count nahi, duplicate deactivate (archival), audit.';

-- =============================================================================
-- 4) FEATURE FLAG SETTER (README §55 write side; read/table DB A me)
-- =============================================================================
-- Manual switch + optional schedule. Sirf mojood keys (DB A ne 4 seed kiye).
-- p_clear_schedule=true se window hata di jati hai (coalesce se null "no change"
-- ka matlab rakhta hai, is liye clear ke liye alag flag).
create or replace function public.set_feature_flag(
  p_key            text,
  p_enabled        boolean     default null,
  p_starts_at      timestamptz default null,
  p_ends_at        timestamptz default null,
  p_clear_schedule boolean     default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_starts  timestamptz;
  v_ends    timestamptz;
  v_hit     int;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  -- Schedule: clear flag ho to dono null; warna jo diya (null = na badlo).
  if p_clear_schedule then
    v_starts := null;
    v_ends   := null;
  else
    select coalesce(p_starts_at, f.starts_at), coalesce(p_ends_at, f.ends_at)
      into v_starts, v_ends
      from public.feature_flags f
     where f.key = p_key;
  end if;

  if v_starts is not null and v_ends is not null and v_ends < v_starts then
    raise exception 'The end time must be after the start time.' using errcode = 'check_violation';
  end if;

  update public.feature_flags f
     set is_enabled = coalesce(p_enabled, f.is_enabled),
         starts_at  = v_starts,
         ends_at    = v_ends,
         updated_at = now(),
         updated_by = v_uid
   where f.key = p_key;
  get diagnostics v_hit = row_count;

  if v_hit = 0 then
    raise exception 'That control is not available.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    'feature_flag.update',
    'feature_flag',
    null,
    jsonb_build_object(
      'key',      p_key,
      'enabled',  p_enabled,
      'scheduled', (v_starts is not null or v_ends is not null)
    )
  );
end;
$$;

comment on function public.set_feature_flag(text, boolean, timestamptz, timestamptz, boolean) is
  'Feature switch set karo (README §55). Manual + optional schedule (server time). Sirf mojood keys. Audit.';

-- admin_feature_flags: admin ke liye chaaron switch ki current halat (read).
create or replace function public.admin_feature_flags()
returns table (
  key         text,
  label       text,
  is_enabled  boolean,
  enabled_now boolean,
  starts_at   timestamptz,
  ends_at     timestamptz,
  updated_at  timestamptz
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
      f.key, f.label, f.is_enabled,
      public.feature_enabled(f.key) as enabled_now,
      f.starts_at, f.ends_at, f.updated_at
    from public.feature_flags f
    order by f.key;
end;
$$;

comment on function public.admin_feature_flags() is
  'Admin ko chaaron feature switch ki halat (README §55): manual + abhi effective (enabled_now).';

-- =============================================================================
-- 5) CRITERIA EDITOR (README §49 "Review Criteria")
-- =============================================================================
-- Hard delete nahi (review_answers.criterion_id on delete restrict). Archival
-- is_active=false se. Naya criterion add ho to submit_review khud usay expect
-- karne lagti hai (wo active criteria count karti hai).
create or replace function public.admin_criteria_list()
returns table (
  id           uuid,
  category     public.person_category,
  key          text,
  label        text,
  help_text    text,
  kind         public.review_criterion_kind,
  sort_order   smallint,
  is_active    boolean,
  answer_count bigint
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
      c.id, c.category, c.key, c.label, c.help_text, c.kind, c.sort_order, c.is_active,
      (select count(*) from public.review_answers a where a.criterion_id = c.id)
    from public.review_criteria c
    order by c.category, c.sort_order, c.key;
end;
$$;

comment on function public.admin_criteria_list() is
  'Admin ko saare review criteria (inactive bhi) + answer_count.';

-- admin_upsert_criterion: p_id null = naya (category/key/kind zaroori). Warna
-- update - magar category/key/kind NAHI badalte (wo answers ka matlab badal
-- dete). Sirf label/help/sort/is_active.
create or replace function public.admin_upsert_criterion(
  p_id         uuid,
  p_category   public.person_category,
  p_key        text,
  p_label      text,
  p_help_text  text,
  p_kind       public.review_criterion_kind,
  p_sort_order smallint,
  p_is_active  boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_label text;
  v_help  text;
  v_key   text;
  v_id    uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_label := nullif(btrim(coalesce(p_label, '')), '');
  if v_label is null then
    raise exception 'A label is required.' using errcode = 'check_violation';
  end if;
  v_help := nullif(btrim(coalesce(p_help_text, '')), '');

  if p_id is null then
    -- Naya criterion.
    v_key := lower(btrim(coalesce(p_key, '')));
    if v_key !~ '^[a-z0-9_]+$' then
      raise exception 'The key may use only lowercase letters, numbers and underscores.'
        using errcode = 'check_violation';
    end if;
    if p_category is null or p_kind is null then
      raise exception 'Category and kind are required.' using errcode = 'check_violation';
    end if;

    insert into public.review_criteria (category, key, label, help_text, kind, sort_order, is_active)
    values (p_category, v_key, v_label, v_help, p_kind,
            coalesce(p_sort_order, 0), coalesce(p_is_active, true))
    returning id into v_id;
  else
    -- Update: category/key/kind ko haath nahi. Answers ka matlab qaim rahe.
    update public.review_criteria
       set label      = v_label,
           help_text  = v_help,
           sort_order = coalesce(p_sort_order, sort_order),
           is_active  = coalesce(p_is_active, is_active)
     where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'That criterion is not available.' using errcode = 'no_data_found';
    end if;
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when p_id is null then 'criterion.create' else 'criterion.update' end,
    'review_criterion',
    v_id,
    jsonb_build_object('isActive', coalesce(p_is_active, true))
  );

  return v_id;
end;
$$;

comment on function public.admin_upsert_criterion(uuid, public.person_category, text, text, text, public.review_criterion_kind, smallint, boolean) is
  'Review criterion banao/update (README §49). Update par category/key/kind lock (answers safe). Hard delete nahi - is_active=false.';

-- =============================================================================
-- 6) Grants - STANDING RULE: pehle sab se chheeno, phir do. Sab admin cheezein
--    authenticated ko (andar is_admin() gate). Koi anon nahi.
-- =============================================================================
revoke all on function public.admin_notification_list(int, int)                                                                            from public, anon, authenticated;
revoke all on function public.admin_upsert_notification(uuid, text, text, public.notification_priority, text, text, boolean, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_delete_notification(uuid)                                                                              from public, anon, authenticated;
revoke all on function public.admin_reset_person_reviews(uuid, text)                                                                       from public, anon, authenticated;
revoke all on function public.admin_merge_people(uuid, uuid, text)                                                                         from public, anon, authenticated;
revoke all on function public.set_feature_flag(text, boolean, timestamptz, timestamptz, boolean)                                           from public, anon, authenticated;
revoke all on function public.admin_feature_flags()                                                                                        from public, anon, authenticated;
revoke all on function public.admin_criteria_list()                                                                                        from public, anon, authenticated;
revoke all on function public.admin_upsert_criterion(uuid, public.person_category, text, text, text, public.review_criterion_kind, smallint, boolean) from public, anon, authenticated;

grant execute on function public.admin_notification_list(int, int)                                                                         to authenticated;
grant execute on function public.admin_upsert_notification(uuid, text, text, public.notification_priority, text, text, boolean, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_delete_notification(uuid)                                                                           to authenticated;
grant execute on function public.admin_reset_person_reviews(uuid, text)                                                                    to authenticated;
grant execute on function public.admin_merge_people(uuid, uuid, text)                                                                      to authenticated;
grant execute on function public.set_feature_flag(text, boolean, timestamptz, timestamptz, boolean)                                        to authenticated;
grant execute on function public.admin_feature_flags()                                                                                     to authenticated;
grant execute on function public.admin_criteria_list()                                                                                     to authenticated;
grant execute on function public.admin_upsert_criterion(uuid, public.person_category, text, text, text, public.review_criterion_kind, smallint, boolean) to authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * Admin notifications bana/update/delete kar sakta hai; schedule khud
--     activate/deactivate karti hai (koi code change nahi - README §54).
--   * Review reset archival hai (removed, delete nahi); aggregate foran 0.
--   * Duplicate merge children safe shift karta hai (double count nahi) aur
--     duplicate deactivate karta hai.
--   * Feature switch admin set kar sakta hai (manual + schedule, server time).
--   * Review criteria admin manage kar sakta hai (archival, hard delete nahi).
--   * Har action audit log me.
--
-- Owner (Windows) par apply ke baad tez tasdeeq (admin session me):
--   select * from public.admin_feature_flags();
--   select public.set_feature_flag('review_submission', false);  -- band
--   select public.feature_enabled('review_submission');           -- false
--   select public.set_feature_flag('review_submission', true);    -- wapas
--   select * from public.admin_notification_list();
-- =============================================================================
