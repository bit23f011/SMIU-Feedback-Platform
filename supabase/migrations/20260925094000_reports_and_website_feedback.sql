-- =============================================================================
-- 20260925094000_reports_and_website_feedback.sql
--
-- Phase 5 DB B. Do alag-alag cheezein, jaan boojh kar ek doosre se juda:
--
--   A) PROFILE REPORTS (README §51). User kisi profile ko report kar sakta hai
--      (duplicate / wrong info / incorrect / other). Report se banda KABHI
--      khud-ba-khud delete nahi hota; admin accept kare to bhi deactivation ek
--      ALAG explicit qadam hai. Har faisla audit log me.
--
--   B) WEBSITE FEEDBACK (README §56-§59). Yeh ProfAura KHUD ke baare me feedback
--      hai (bug, suggestion, etc). Teacher reviews/reports se BILKUL alag dataset.
--      Kisi rating/ranking ko chhoo bhi nahi sakta (koi FK people par nahi).
--      Public visitor bhi bhej sakta hai. Student ID / student email / auth id /
--      contact email kabhi public expose nahi hote.
--
-- SAFETY (README §27, §30):
--   * Sirf naye types/tables/functions banaye. Kisi mojood cheez ko haath nahi.
--   * Dono tables par RLS ON magar koi client policy NAHI: saara access sirf
--     SECURITY DEFINER functions se hota hai (definer RLS bypass karta hai).
--     Is se table "khula" nahi rehta aur PII bahar nahi jata.
--   * Har function revoke-before-grant. Public reads (feedback submit) = anon +
--     authenticated; admin cheezein = authenticated (andar is_admin() gate).
--   * Report submit sirf verified student (spam kam), feedback submit koi bhi.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0) Enums (idempotent, wahi pattern jo reference_schema me hai).
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'report_reason') then
    create type public.report_reason as enum (
      'duplicate_profile',
      'wrong_information',
      'incorrect_profile',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type public.report_status as enum (
      'pending',
      'accepted',
      'rejected'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'website_feedback_type') then
    create type public.website_feedback_type as enum (
      'website_feedback',
      'suggest_update',
      'report_bug',
      'report_issue',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'website_feedback_status') then
    create type public.website_feedback_status as enum (
      'new',
      'reviewing',
      'resolved',
      'archived'
    );
  end if;
end
$$;

-- =============================================================================
-- A) PROFILE REPORTS (README §51)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A1) person_reports table.
--     reporter_id sirf internal record ke liye (kis student ne report kiya),
--     kabhi public expose nahi hota. Accept/reject ka faisla admin ka.
-- -----------------------------------------------------------------------------
create table if not exists public.person_reports (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.people (id) on delete cascade,
  reporter_id  uuid references public.profiles (id) on delete set null,
  reason       public.report_reason not null,
  details      text,
  status       public.report_status not null default 'pending',
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.profiles (id) on delete set null,
  resolution_note text,
  -- Details chhota rahe (free text spam ki had).
  check (details is null or char_length(details) <= 1000),
  check (resolution_note is null or char_length(resolution_note) <= 1000)
);

comment on table public.person_reports is
  'Profile reports (README §51). reporter_id sirf internal; accept se banda auto-delete NAHI hota. RLS on, access sirf functions se.';

create index if not exists person_reports_status_idx
  on public.person_reports (status, created_at desc);
create index if not exists person_reports_person_idx
  on public.person_reports (person_id);

-- Ek student ek profile par ek waqt me ek hi PENDING report rakhe (spam brake).
create unique index if not exists person_reports_one_pending_per_user
  on public.person_reports (person_id, reporter_id)
  where status = 'pending' and reporter_id is not null;

alter table public.person_reports enable row level security;
-- Koi policy nahi = default deny. Saara access neeche wali functions se.

-- -----------------------------------------------------------------------------
-- A2) submit_person_report - verified student hi, server-side gated.
-- -----------------------------------------------------------------------------
create or replace function public.submit_person_report(
  p_person_id uuid,
  p_reason    public.report_reason,
  p_details   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_details text;
  v_today   int;
  v_id      uuid;
begin
  if v_uid is null or not public.is_verified_student() then
    raise exception 'Your account cannot report profiles.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.people p where p.id = p_person_id and p.is_active) then
    raise exception 'That profile is not available.' using errcode = 'no_data_found';
  end if;

  v_details := nullif(btrim(coalesce(p_details, '')), '');

  if v_details is not null and char_length(v_details) > 1000 then
    raise exception 'Please keep the details shorter.' using errcode = 'check_violation';
  end if;

  -- Rozana had: ek din me itni se zyada report nahi.
  select count(*)::int into v_today
    from public.person_reports r
   where r.reporter_id = v_uid
     and r.created_at > now() - interval '24 hours';

  if v_today >= 10 then
    raise exception 'You have reached the daily limit for reports.' using errcode = 'check_violation';
  end if;

  -- Ek profile par ek waqt me ek hi pending report. Asli taala partial unique
  -- index hai (race ke liye); yeh check sirf insaani jumla dene ko hai.
  if exists (
    select 1 from public.person_reports r
     where r.person_id  = p_person_id
       and r.reporter_id = v_uid
       and r.status = 'pending'
  ) then
    raise exception 'You already have a pending report for this profile.' using errcode = 'unique_violation';
  end if;

  insert into public.person_reports (person_id, reporter_id, reason, details)
  values (p_person_id, v_uid, p_reason, v_details)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.submit_person_report(uuid, public.report_reason, text) is
  'Profile report jama karo (README §51). Sirf verified student; ek profile par ek pending report; rozana had.';

-- -----------------------------------------------------------------------------
-- A3) admin_report_queue - admin ki list (author/ reporter ka naam nahi deti).
-- -----------------------------------------------------------------------------
create or replace function public.admin_report_queue(
  p_status public.report_status default 'pending',
  p_limit  int default 20,
  p_offset int default 0
)
returns table (
  report_id     uuid,
  person_id     uuid,
  person_slug   text,
  person_name   text,
  is_active     boolean,
  reason        public.report_reason,
  details       text,
  status        public.report_status,
  created_at    timestamptz,
  reviewed_at   timestamptz,
  resolution_note text,
  report_count  bigint,
  total_count   bigint
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
      p.is_active,
      r.reason,
      r.details,
      r.status,
      r.created_at,
      r.reviewed_at,
      r.resolution_note,
      -- Isi profile par kitni reports hain (duplicate signal), status chahe koi ho.
      (select count(*) from public.person_reports r2 where r2.person_id = r.person_id),
      count(*) over ()
    from public.person_reports r
    join public.people p on p.id = r.person_id
    where r.status = p_status
    order by r.created_at asc, r.id
    limit  least(greatest(coalesce(p_limit, 20), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

comment on function public.admin_report_queue(public.report_status, int, int) is
  'Admin ka reports queue (README §51). Reporter ka naam nahi deti.';

-- -----------------------------------------------------------------------------
-- A4) resolve_report - accept/reject. README §51: accept se banda DELETE nahi
--     hota. Yeh sirf report ka status badalti hai + audit. Deactivation alag
--     explicit qadam hai (set_person_active neeche).
-- -----------------------------------------------------------------------------
create or replace function public.resolve_report(
  p_report_id uuid,
  p_action    text,
  p_note      text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_person uuid;
  v_status public.report_status;
  v_note   text;
  v_new    public.report_status;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  if p_action = 'accept' then
    v_new := 'accepted';
  elsif p_action = 'reject' then
    v_new := 'rejected';
  else
    raise exception 'That action is not allowed.' using errcode = 'check_violation';
  end if;

  select r.person_id, r.status into v_person, v_status
    from public.person_reports r
   where r.id = p_report_id;

  if not found then
    raise exception 'That report is not available.' using errcode = 'no_data_found';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 1000 then
    raise exception 'Please keep the note shorter.' using errcode = 'check_violation';
  end if;

  update public.person_reports
     set status          = v_new,
         reviewed_at      = now(),
         reviewed_by      = v_uid,
         resolution_note  = v_note
   where id = p_report_id;

  -- Audit (README §51: har faisla log ho). Reporter ka naam nahi jata.
  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    'report.' || p_action,
    'person_report',
    p_report_id,
    jsonb_build_object('person_id', v_person, 'from', v_status)
  );
end;
$$;

comment on function public.resolve_report(uuid, text, text) is
  'Report accept/reject (README §51). Accept se banda delete NAHI hota; deactivation alag qadam. Har faisla audit.';

-- -----------------------------------------------------------------------------
-- A5) set_person_active - report accept ke baad ka EXPLICIT deactivation/
--     reactivation qadam (README §51 "admin must explicitly confirm"). Reason
--     zaroori. Audit hota hai. Yeh reviews ko delete nahi karta; sirf profile
--     ko chhupata/wapas laata hai.
-- -----------------------------------------------------------------------------
create or replace function public.set_person_active(
  p_person_id uuid,
  p_active    boolean,
  p_reason    text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_was    boolean;
  v_reason text;
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

  select p.is_active into v_was
    from public.people p
   where p.id = p_person_id;

  if not found then
    raise exception 'That profile is not available.' using errcode = 'no_data_found';
  end if;

  update public.people
     set is_active = p_active
   where id = p_person_id;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    case when p_active then 'person.reactivate' else 'person.deactivate' end,
    'person',
    p_person_id,
    jsonb_build_object('from_active', v_was, 'reason', v_reason)
  );
end;
$$;

comment on function public.set_person_active(uuid, boolean, text) is
  'Profile ko explicit tor par deactivate/reactivate karo (README §51). Reason zaroori; audit; reviews delete nahi hotin.';

-- =============================================================================
-- B) WEBSITE FEEDBACK (README §56-§59)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- B1) website_feedback table. NOTE: koi FK people/reviews par nahi - yeh dataset
--     rating/ranking ko chhoo hi nahi sakta (README §59). submitted_by sirf
--     internal; public kabhi nahi dikhta.
-- -----------------------------------------------------------------------------
create table if not exists public.website_feedback (
  id             uuid primary key default gen_random_uuid(),
  feedback_type  public.website_feedback_type not null,
  experience_rating smallint,
  message        text not null,
  contact_email  text,
  submitted_by   uuid references public.profiles (id) on delete set null,
  status         public.website_feedback_status not null default 'new',
  is_important   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewed_by    uuid references public.profiles (id) on delete set null,
  check (experience_rating is null or experience_rating between 1 and 5),
  check (char_length(btrim(message)) between 1 and 2000),
  check (contact_email is null or char_length(contact_email) <= 254)
);

comment on table public.website_feedback is
  'ProfAura khud ke baare me feedback (README §56-§59). Reviews/reports/ratings se bilkul alag; koi people FK nahi. RLS on, access sirf functions se. PII kabhi public nahi.';

create index if not exists website_feedback_status_idx
  on public.website_feedback (status, created_at desc);
create index if not exists website_feedback_important_idx
  on public.website_feedback (is_important, created_at desc);

drop trigger if exists website_feedback_set_updated_at on public.website_feedback;
create trigger website_feedback_set_updated_at
  before update on public.website_feedback
  for each row execute function public.set_updated_at();

alter table public.website_feedback enable row level security;
-- Koi policy nahi = default deny. Insert/read sirf functions se.

-- -----------------------------------------------------------------------------
-- B2) submit_website_feedback - public visitor + student dono (README §57).
--     submitted_by auth.uid() se (anon ke liye null). Message zaroori.
--     contact_email optional aur sirf follow-up ke liye store hota hai.
-- -----------------------------------------------------------------------------
create or replace function public.submit_website_feedback(
  p_type          public.website_feedback_type,
  p_rating        smallint,
  p_message       text,
  p_contact_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_message text;
  v_email   text;
  v_id      uuid;
begin
  v_message := nullif(btrim(coalesce(p_message, '')), '');

  if v_message is null then
    raise exception 'Please write your feedback before sending.' using errcode = 'check_violation';
  end if;

  if char_length(v_message) > 2000 then
    raise exception 'Please keep your feedback shorter.' using errcode = 'check_violation';
  end if;

  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'Give a rating between 1 and 5.' using errcode = 'check_violation';
  end if;

  v_email := nullif(btrim(coalesce(p_contact_email, '')), '');
  if v_email is not null then
    if char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'That contact email does not look right.' using errcode = 'check_violation';
    end if;
    v_email := lower(v_email);
  end if;

  insert into public.website_feedback (feedback_type, experience_rating, message, contact_email, submitted_by)
  values (p_type, p_rating, v_message, v_email, v_uid)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.submit_website_feedback(public.website_feedback_type, smallint, text, text) is
  'Website feedback jama karo (README §57). Public + student dono. Message zaroori, rating optional, contact email optional (sirf follow-up).';

-- -----------------------------------------------------------------------------
-- B3) admin_feedback_queue - admin read/search/filter/paginate (README §58).
--     submitted_by ka email/id NAHI deti (README §59). contact_email (jo user ne
--     khud follow-up ke liye diya) admin ko dikhti hai - yehi us ka maqsad hai.
-- -----------------------------------------------------------------------------
create or replace function public.admin_feedback_queue(
  p_status public.website_feedback_status default null,
  p_type   public.website_feedback_type   default null,
  p_search text default null,
  p_important_only boolean default false,
  p_limit  int default 20,
  p_offset int default 0
)
returns table (
  feedback_id       uuid,
  feedback_type     public.website_feedback_type,
  experience_rating smallint,
  message           text,
  contact_email     text,
  status            public.website_feedback_status,
  is_important      boolean,
  from_student      boolean,
  created_at        timestamptz,
  reviewed_at       timestamptz,
  total_count       bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_search text;
begin
  if not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_search := nullif(btrim(coalesce(p_search, '')), '');

  return query
    select
      f.id,
      f.feedback_type,
      f.experience_rating,
      f.message,
      f.contact_email,
      f.status,
      f.is_important,
      -- Sirf yeh batati hai ke logged-in student tha ya nahi. Kaun tha - nahi.
      (f.submitted_by is not null),
      f.created_at,
      f.reviewed_at,
      count(*) over ()
    from public.website_feedback f
    where (p_status is null or f.status = p_status)
      and (p_type   is null or f.feedback_type = p_type)
      and (not p_important_only or f.is_important)
      and (v_search is null or f.message ilike '%' || v_search || '%')
    order by f.is_important desc, f.created_at desc, f.id
    limit  least(greatest(coalesce(p_limit, 20), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

comment on function public.admin_feedback_queue(public.website_feedback_status, public.website_feedback_type, text, boolean, int, int) is
  'Admin ka website feedback queue (README §58). submitted_by ki pehchaan/email NAHI deti (README §59); sirf from_student boolean.';

-- -----------------------------------------------------------------------------
-- B4) update_feedback - status change + mark important (README §58). Audit.
-- -----------------------------------------------------------------------------
create or replace function public.update_feedback(
  p_feedback_id uuid,
  p_status      public.website_feedback_status default null,
  p_important   boolean default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_old public.website_feedback_status;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  if p_status is null and p_important is null then
    raise exception 'Nothing to update.' using errcode = 'check_violation';
  end if;

  select f.status into v_old
    from public.website_feedback f
   where f.id = p_feedback_id;

  if not found then
    raise exception 'That feedback is not available.' using errcode = 'no_data_found';
  end if;

  update public.website_feedback
     set status       = coalesce(p_status, status),
         is_important = coalesce(p_important, is_important),
         reviewed_at  = now(),
         reviewed_by  = v_uid
   where id = p_feedback_id;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    'feedback.update',
    'website_feedback',
    p_feedback_id,
    jsonb_build_object(
      'from_status', v_old,
      'to_status',   coalesce(p_status, v_old),
      'important',   p_important
    )
  );
end;
$$;

comment on function public.update_feedback(uuid, public.website_feedback_status, boolean) is
  'Website feedback ka status / important toggle (README §58). Audit hota hai.';

-- -----------------------------------------------------------------------------
-- C) Grants - STANDING RULE: pehle sab se chheeno, phir do.
-- -----------------------------------------------------------------------------
revoke all on function public.submit_person_report(uuid, public.report_reason, text)                         from public, anon, authenticated;
revoke all on function public.admin_report_queue(public.report_status, int, int)                             from public, anon, authenticated;
revoke all on function public.resolve_report(uuid, text, text)                                               from public, anon, authenticated;
revoke all on function public.set_person_active(uuid, boolean, text)                                         from public, anon, authenticated;
revoke all on function public.submit_website_feedback(public.website_feedback_type, smallint, text, text)    from public, anon, authenticated;
revoke all on function public.admin_feedback_queue(public.website_feedback_status, public.website_feedback_type, text, boolean, int, int) from public, anon, authenticated;
revoke all on function public.update_feedback(uuid, public.website_feedback_status, boolean)                 from public, anon, authenticated;

-- Report jama karna: logged-in (verified) student. Andar bhi gate hai.
grant execute on function public.submit_person_report(uuid, public.report_reason, text) to authenticated;
-- Admin cheezein: authenticated ko grant, andar is_admin() gate.
grant execute on function public.admin_report_queue(public.report_status, int, int) to authenticated;
grant execute on function public.resolve_report(uuid, text, text)                    to authenticated;
grant execute on function public.set_person_active(uuid, boolean, text)              to authenticated;
grant execute on function public.admin_feedback_queue(public.website_feedback_status, public.website_feedback_type, text, boolean, int, int) to authenticated;
grant execute on function public.update_feedback(uuid, public.website_feedback_status, boolean)             to authenticated;
-- Website feedback jama karna: public visitor bhi (README §57), is liye anon bhi.
grant execute on function public.submit_website_feedback(public.website_feedback_type, smallint, text, text) to anon, authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * person_reports + website_feedback dono tables RLS-locked; koi seedha
--     select/insert nahi kar sakta, sab kuch functions se.
--   * Report accept se banda delete NAHI hota; deactivation alag confirm qadam
--     (set_person_active, reason zaroori). Har report/deactivation audit me.
--   * Website feedback bilkul alag dataset: koi people FK nahi, kisi rating/
--     ranking ko chhoo nahi sakta. Admin queue submitter ki pehchaan expose
--     nahi karti (sirf from_student boolean + jo contact email user ne khud diya).
--
-- Owner (Windows) par apply ke baad tez tasdeeq:
--   -- feedback insert (anon bhi kar sakta):
--   select public.submit_website_feedback('report_bug', 4, 'Search slow hai', null);
--   -- admin queue (admin session me):
--   select * from public.admin_feedback_queue();
-- =============================================================================
