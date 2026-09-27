-- =============================================================================
-- ProfAura — Migration 0005: Auth foundation (Phase 2)
-- -----------------------------------------------------------------------------
-- Phase 2 ka pehla hissa: student accounts + university email verification.
--
-- DESIGN RULE (standing): frontend sirf UI hai. Har lock yahan DB me hai —
-- email domain, role, verification. Browser me kuch bhi bypass ho jaye, DB
-- phir bhi mana kar degi.
--
-- Is migration me 4 cheezein hain:
--   1) universities.email_domains  — kis domain ka email us university ka
--      student mana jayega (multi-university safe, hardcode nahi)
--   2) public.profiles             — auth.users ka public-schema saathi row
--   3) auth.users par 2 triggers   — domain enforce + profile auto-create
--   4) RLS + helper functions      — sirf apni row, aur verified-student check
--
-- Idempotent: dobara chalane par safe.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) universities.email_domains
--    text[] is liye ke ek university ke multiple valid domains ho sakte hain
--    (misal: student portal aur staff portal alag). Empty array ka matlab hai
--    "is university me abhi signup band hai" — yeh jaan boojh kar fail-closed hai.
-- -----------------------------------------------------------------------------
alter table public.universities
  add column if not exists email_domains text[] not null default '{}';

comment on column public.universities.email_domains is
  'Lowercase domains jinka email is university ka student mana jata hai. Khali = signup band (fail-closed).';

-- SMIU ka student domain. Agar aage koi aur domain add karna ho to yahan nahi,
-- admin server action se — magar Phase 2 me seed hi source hai.
update public.universities
   set email_domains = array['smiu.edu.pk']
 where slug = 'smiu'
   and email_domains = '{}';

-- -----------------------------------------------------------------------------
-- 2) Roles enum + profiles table
--    profiles me JAAN BOOJH KAR koi naam/student-id nahi hai. Reviews anonymous
--    hain; jo data hum rakhte hi nahi, wo leak bhi nahi ho sakta.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('student', 'admin');
  end if;
end
$$;

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  university_id uuid references public.universities (id) on delete restrict,
  -- Email yahan bhi rakha hai taake queries ko auth schema tak jana na pare.
  -- Hamesha lowercase — check constraint isay enforce karti hai.
  email         text not null unique check (email = lower(email)),
  role          public.app_role not null default 'student',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'auth.users ka public-schema saathi. Koi naam/student-id nahi — reviews anonymous hain.';
comment on column public.profiles.role is
  'student ya admin. User KHUD isay kabhi change nahi kar sakta (koi update grant nahi).';
comment on column public.profiles.is_active is
  'false = account band. Admin moderation Phase 5 me isay use karegi.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3a) EMAIL DOMAIN LOCK — auth.users par BEFORE INSERT trigger.
--
--     Yeh Phase 2 ka sab se ahem security control hai. Signup form me domain
--     check sirf UX hai (user ko jaldi bata dena). Asli rok yahan hai: chahe
--     koi seedha Supabase auth API hit kare, non-university email reject hoga.
-- -----------------------------------------------------------------------------
create or replace function public.enforce_university_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_domain text;
  v_ok     boolean;
begin
  -- Email ko normalise karo. @ ke baad wala hissa domain hai.
  v_domain := lower(split_part(coalesce(new.email, ''), '@', 2));

  if v_domain = '' then
    raise exception 'A valid email address is required.'
      using errcode = 'check_violation';
  end if;

  select exists (
    select 1
      from public.universities u
     where u.is_active
       and v_domain = any (u.email_domains)
  ) into v_ok;

  if not v_ok then
    -- Message jaan boojh kar generic hai: kaunse domains allowed hain, yeh
    -- batana enumeration me madad deta hai. UI apni taraf se hint dikhati hai.
    raise exception 'This email address is not eligible for an account.'
      using errcode = 'check_violation';
  end if;

  -- Email hamesha lowercase store ho, taake duplicate accounts na banein.
  new.email := lower(new.email);
  return new;
end;
$$;

comment on function public.enforce_university_email() is
  'auth.users BEFORE INSERT — sirf approved university domain ka email account bana sakta hai.';

drop trigger if exists enforce_university_email on auth.users;
create trigger enforce_university_email
  before insert on auth.users
  for each row execute function public.enforce_university_email();

-- -----------------------------------------------------------------------------
-- 3b) PROFILE AUTO-CREATE — auth.users par AFTER INSERT trigger.
--     Role hamesha 'student' hardcode hai. Signup ke waqt bheja gaya koi bhi
--     metadata yahan JAAN BOOJH KAR ignore hota hai — warna client apne aap ko
--     admin bana sakta tha.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_domain        text;
  v_university_id uuid;
begin
  v_domain := lower(split_part(coalesce(new.email, ''), '@', 2));

  select u.id into v_university_id
    from public.universities u
   where u.is_active
     and v_domain = any (u.email_domains)
   limit 1;

  insert into public.profiles (id, university_id, email, role)
  values (new.id, v_university_id, lower(new.email), 'student')
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users AFTER INSERT — profile row banata hai. Role hamesha student (client metadata ignore).';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4a) Helper functions — RLS policies inhe use karti hain.
--     SECURITY DEFINER is liye ke auth.users normal user ko readable nahi.
-- -----------------------------------------------------------------------------

-- Kya current user ek verified, active student hai?
-- Verification ka sach auth.users.email_confirmed_at hai — hum usay profiles me
-- duplicate NAHI karte, warna dono me farq aa sakta hai.
create or replace function public.is_verified_student()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
      from auth.users u
      join public.profiles p on p.id = u.id
     where u.id = auth.uid()
       and u.email_confirmed_at is not null
       and p.role = 'student'
       and p.is_active
  );
$$;

comment on function public.is_verified_student() is
  'true sirf tab jab user ka email confirm ho chuka ho aur profile active student ho.';

-- Kya current user admin hai? (Admin role sirf DB me manually set hota hai.)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and p.role = 'admin'
       and p.is_active
  );
$$;

comment on function public.is_admin() is
  'true sirf active admin profile ke liye. Role kabhi client se set nahi hota.';

-- STANDING RULE: har nayi function se public/anon ka default execute chheeno.
revoke all on function public.enforce_university_email() from public, anon, authenticated;
revoke all on function public.handle_new_user()          from public, anon, authenticated;
revoke all on function public.is_verified_student()      from public, anon;
revoke all on function public.is_admin()                 from public, anon;

-- Sirf logged-in user apne baare me poochh sakta hai.
grant execute on function public.is_verified_student() to authenticated;
grant execute on function public.is_admin()            to authenticated;

-- -----------------------------------------------------------------------------
-- 4b) RLS on profiles
--     UPDATE/INSERT/DELETE ka koi grant NAHI hai — yeh role-escalation ke khilaf
--     sab se sasti aur mazboot defence hai. Profile rows sirf trigger banata hai.
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

grant select on public.profiles to authenticated;
-- anon ko profiles par kuch bhi nahi.

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "admin reads all profiles" on public.profiles;
create policy "admin reads all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Security notes
-- -----------------------------------------------------------------------------
-- * profiles par koi insert/update/delete policy ya grant nahi — koi bhi user
--   apna role 'admin' nahi kar sakta. Admin banane ka raasta sirf service-role
--   (server) hai.
-- * enforce_university_email aur handle_new_user se authenticated ka execute bhi
--   chheen liya — yeh sirf trigger context me chalti hain (definer owner ke tor par).
-- * email lowercase constraint duplicate accounts (Ali@ vs ali@) rokti hai.
-- * Phase 1 ki reference tables ki RLS bilkul waisi hi hai — yahan chheri nahi.
