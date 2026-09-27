-- =============================================================================
-- ProfAura — Migration 0004: Positions cleanup + person gender (Phase 1)
-- -----------------------------------------------------------------------------
-- Do kaam karta hai:
--
-- 1) POSITIONS CLEANUP
--    Reference data me sirf approved designations rehni chahiye:
--      Coordinator, HOD, Associate Professor, Professor, Dean
--    Baqi sab (Lecturer, Senior Lecturer, Assistant Professor, Registrar,
--    Deputy Registrar, HR Officer/Manager/Assistant, Librarian, Examination
--    Officer, IT Support Officer, Lab Engineer, Accounts Officer, Teaching
--    Assistant, Chairperson waghera) DELETE ho jati hain.
--
--    Migration 0003 (production seed) bhi update ho chuki hai, isliye FRESH
--    database par yeh purani rows banti hi nahi. Yeh migration un databases ke
--    liye hai jahan 0003 ka purana version pehle hi chal chuka tha.
--
--    Safe hai: person_roles.position_id `on delete set null` hai, to koi person
--    row delete nahi hoti — sirf uska position link khali ho jata hai. Jis
--    designation ke liye koi approved option nahi, uske liye UI me "Other" hai
--    (position_id null + person_roles.title_override me asal title).
--
-- 2) PERSON GENDER
--    people.gender column (enum person_gender) — sirf default avatar choose karne
--    ke liye. MVP me koi photo upload nahi hai. Nullable hai: null = unknown, us
--    surat me neutral avatar dikhta hai. Yeh public directory data hai, kisi
--    student ka PII nahi.
--
-- Idempotent: dobara chalane par safe.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1a) positions.category ko nullable karo.
--     null = designation kisi bhi category me use ho sakti hai. Pehle har position
--     ek hi category se bandhi thi, magar approved list chhoti aur generic hai
--     (Coordinator teacher bhi ho sakta hai aur staff bhi).
-- -----------------------------------------------------------------------------
alter table public.positions alter column category drop not null;

comment on column public.positions.category is
  'null = designation har category me available hai. Value set ho to sirf usi category me.';

-- -----------------------------------------------------------------------------
-- 1b) Purane slugs ko approved naam par le aao (delete se pehle), taake jin logon
--     ke roles in positions se jure hain wo link na toote.
--       head-of-department -> hod          (title: "HOD")
--       program-coordinator -> coordinator (title: "Coordinator")
--     `not exists` guard isliye hai ke agar nayi row pehle se mojood ho to slug
--     unique constraint na toote.
-- -----------------------------------------------------------------------------
update public.positions p
   set slug = 'hod', title = 'HOD', category = null, rank = 40
 where p.slug = 'head-of-department'
   and not exists (select 1 from public.positions x where x.slug = 'hod');

update public.positions p
   set slug = 'coordinator', title = 'Coordinator', category = null, rank = 30
 where p.slug = 'program-coordinator'
   and not exists (select 1 from public.positions x where x.slug = 'coordinator');

-- -----------------------------------------------------------------------------
-- 1c) Approved paanch designations ensure karo (0003 jaisa hi content).
-- -----------------------------------------------------------------------------
insert into public.positions (slug, title, category, rank, is_active) values
  ('coordinator',         'Coordinator',         null, 30, true),
  ('hod',                 'HOD',                 null, 40, true),
  ('associate-professor', 'Associate Professor', null, 50, true),
  ('professor',           'Professor',           null, 60, true),
  ('dean',                'Dean',                null, 70, true)
on conflict (slug) do update
  set title     = excluded.title,
      category  = excluded.category,
      rank      = excluded.rank,
      is_active = excluded.is_active;

-- -----------------------------------------------------------------------------
-- 1d) Jo bhi approved list me nahi hai, use hata do.
--     Allow-list approach jaan boojh kar use ki hai: agar kal koi aur unwanted
--     designation kisi purane environment me pari ho, wo bhi yahin clean ho jaye.
-- -----------------------------------------------------------------------------
delete from public.positions
 where slug not in ('coordinator', 'hod', 'associate-professor', 'professor', 'dean');

-- -----------------------------------------------------------------------------
-- 2) people.gender
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'person_gender') then
    create type public.person_gender as enum (
      'male',
      'female'
    );
  end if;
end
$$;

alter table public.people
  add column if not exists gender public.person_gender;

comment on column public.people.gender is
  'Sirf default avatar (male/female illustration) choose karne ke liye. null = neutral avatar.';

-- -----------------------------------------------------------------------------
-- Security note
-- -----------------------------------------------------------------------------
-- Yahan koi naya table nahi bana, isliye koi nayi RLS policy ya grant zaroori nahi.
-- positions aur people par RLS pehle se enabled hai (migration 0002) aur public ko
-- sirf SELECT mila hua hai — naya column usi maujooda read-only policy me aata hai.
-- Public ko INSERT/UPDATE/DELETE kahin nahi diya gaya; writes sirf service-role ya
-- future admin server actions se hongi.
