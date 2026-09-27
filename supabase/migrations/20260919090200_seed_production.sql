-- =============================================================================
-- ProfAura — Migration 0003: Production seed (Phase 1)
-- -----------------------------------------------------------------------------
-- Ye "real backbone" reference data hai jo HAR environment (prod included) me hona
-- chahiye: pehli university (SMIU), designations (positions), aur semesters.
--
-- Departments / programs / courses / people / reviews yahan NAHI — wo admin panel
-- (Phase 2+) se ya alag verified seed se aayenge. Sample/demo data dev seed me hai
-- (supabase/seed/seed_dev.sql), taake demo data kabhi prod me na chala jaye.
--
-- Idempotent: dobara chalane par safe (on conflict).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- University: SMIU (pehli institution)
-- -----------------------------------------------------------------------------
insert into public.universities (slug, short_name, full_name, city, country, website, is_active)
values
  ('smiu', 'SMIU', 'Sindh Madressatul Islam University', 'Karachi', 'Pakistan', 'https://www.smiu.edu.pk', true)
on conflict (slug) do update
  set short_name = excluded.short_name,
      full_name  = excluded.full_name,
      city       = excluded.city,
      country    = excluded.country,
      website    = excluded.website;

-- -----------------------------------------------------------------------------
-- Positions (designations) — APPROVED LIST ONLY.
--
-- Sirf yeh paanch designations platform me exist karti hain. Iske ilawa koi
-- position na yahan add karo, na UI me hardcode karo. Jo designation in paanch me
-- nahi aati, uske liye UI me "Other" option hai: us case me person_roles.position_id
-- null rehta hai aur asal title person_roles.title_override me jata hai.
--
-- category null = designation kisi bhi category (teacher/lab/faculty/staff/HR) ke
-- sath use ho sakti hai. rank sirf ordering/seniority ke liye hai (bada = senior).
-- -----------------------------------------------------------------------------
insert into public.positions (slug, title, category, rank, is_active) values
  ('coordinator',         'Coordinator',         null, 30, true),
  ('hod',                 'HOD',                 null, 40, true),
  ('associate-professor', 'Associate Professor', null, 50, true),
  ('professor',           'Professor',           null, 60, true),
  ('dean',                'Dean',                null, 70, true)
on conflict (slug) do update
  set title    = excluded.title,
      category = excluded.category,
      rank     = excluded.rank,
      is_active = excluded.is_active;

-- -----------------------------------------------------------------------------
-- Semesters — dates approximate/illustrative hain (Pakistan calendar), admin adjust
-- kar sakta hai. Filhaal Fall 2026 ko current mark kiya (aaj: 2026-09-19).
-- -----------------------------------------------------------------------------
insert into public.semesters (slug, season, year, label, starts_on, ends_on, is_current) values
  ('spring-2025', 'spring', 2025, 'Spring 2025', date '2025-02-03', date '2025-06-13', false),
  ('fall-2025',   'fall',   2025, 'Fall 2025',   date '2025-09-01', date '2026-01-16', false),
  ('spring-2026', 'spring', 2026, 'Spring 2026', date '2026-02-02', date '2026-06-12', false),
  ('fall-2026',   'fall',   2026, 'Fall 2026',   date '2026-09-01', date '2027-01-15', true),
  ('spring-2027', 'spring', 2027, 'Spring 2027', date '2027-02-01', date '2027-06-11', false)
on conflict (slug) do update
  set label      = excluded.label,
      starts_on  = excluded.starts_on,
      ends_on    = excluded.ends_on,
      is_current = excluded.is_current;
