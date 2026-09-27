-- =============================================================================
-- ProfAura — DEV SEED (sample/demo data) — NOT for production
-- -----------------------------------------------------------------------------
-- Ye sirf local/dev testing ke liye sample directory data hai: departments,
-- programs, courses, sample people (aur unke MULTIPLE roles), offerings,
-- assignments, aur ek sample banner notification.
--
-- Isse prod par NA chalayein. Prod ka real backbone migration 0003 me hai.
-- Manually apply (dev):  supabase db execute --file supabase/seed/seed_dev.sql
--   (ya SQL editor me paste karke chalayein — sirf dev project par).
--
-- Fixed UUIDs use kiye hain taake FKs wire hon aur dobara chalana idempotent rahe.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Departments (SMIU ke andar) — DEMO
-- -----------------------------------------------------------------------------
insert into public.departments (id, university_id, slug, name, short_name, is_active)
values
  ('11111111-1111-4111-8111-111111111111',
   (select id from public.universities where slug = 'smiu'),
   'computer-science', 'Computer Science', 'CS', true),
  ('11111111-1111-4111-8111-111111111112',
   (select id from public.universities where slug = 'smiu'),
   'software-engineering', 'Software Engineering', 'SE', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Programs — DEMO
-- -----------------------------------------------------------------------------
insert into public.programs (id, department_id, slug, name, short_name, level, is_active)
values
  ('22222222-2222-4222-8222-222222222221',
   '11111111-1111-4111-8111-111111111111',
   'bsit', 'BS Information Technology', 'BSIT', 'undergraduate', true),
  ('22222222-2222-4222-8222-222222222222',
   '11111111-1111-4111-8111-111111111111',
   'bscs', 'BS Computer Science', 'BSCS', 'undergraduate', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Courses — DEMO
-- -----------------------------------------------------------------------------
insert into public.courses (id, department_id, program_id, code, title, slug, credit_hours, is_active)
values
  ('33333333-3333-4333-8333-333333333331',
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222221',
   'CS-101', 'Programming Fundamentals', 'programming-fundamentals', 3.0, true),
  ('33333333-3333-4333-8333-333333333332',
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222221',
   'CS-201', 'Data Structures', 'data-structures', 3.0, true),
  ('33333333-3333-4333-8333-333333333333',
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222221',
   'CS-301', 'Database Systems', 'database-systems', 3.0, true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- People — DEMO (fictional). Note: p1 aur p2 ke MULTIPLE roles hain
-- (ONE PERSON = ONE PROFILE). gender sirf default avatar ke liye hai.
-- -----------------------------------------------------------------------------
insert into public.people
  (id, university_id, slug, full_name, display_name, title_prefix, headline, gender, primary_category, is_active, is_verified)
values
  ('44444444-4444-4444-8444-444444444441',
   (select id from public.universities where slug = 'smiu'),
   'ayesha-khan', 'Ayesha Khan', 'Dr. Ayesha Khan', 'Dr.',
   'Associate Professor, Computer Science', 'female', 'faculty', true, true),
  ('44444444-4444-4444-8444-444444444442',
   (select id from public.universities where slug = 'smiu'),
   'bilal-ahmed', 'Bilal Ahmed', 'Bilal Ahmed', 'Mr.',
   'Course Instructor, Software Engineering', 'male', 'teacher', true, true),
  ('44444444-4444-4444-8444-444444444443',
   (select id from public.universities where slug = 'smiu'),
   'sana-malik', 'Sana Malik', 'Sana Malik', 'Ms.',
   'Coordinator, Student Services', 'female', 'university_staff', true, true),
  ('44444444-4444-4444-8444-444444444444',
   (select id from public.universities where slug = 'smiu'),
   'imran-sheikh', 'Imran Sheikh', 'Imran Sheikh', 'Mr.',
   'Human Resources', 'male', 'hr_staff', true, true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- person_roles — yahan ek person ke multiple roles dikhte hain.
--
-- Positions sirf approved list se aati hain (Coordinator, HOD, Associate
-- Professor, Professor, Dean). Jahan koi approved designation fit nahi hoti,
-- wahan "Other" pattern use hota hai: position_id = null + title_override me
-- free text. Neeche dono cases mojood hain taake UI dono handle karna seekhe.
--
--   p1 (Ayesha): faculty (Associate Professor, PRIMARY) + teacher (Other)
--   p2 (Bilal):  teacher (Other, PRIMARY) + lab_instructor (Other)
--   p3 (Sana):   university_staff (Coordinator, PRIMARY)
--   p4 (Imran):  hr_staff (Other, PRIMARY)
-- -----------------------------------------------------------------------------
insert into public.person_roles
  (id, person_id, category, position_id, department_id, title_override, is_primary, is_active)
values
  -- Ayesha: 2 roles
  ('66666666-6666-4666-8666-666666666661',
   '44444444-4444-4444-8444-444444444441', 'faculty',
   (select id from public.positions where slug = 'associate-professor'),
   '11111111-1111-4111-8111-111111111111', null, true, true),
  ('66666666-6666-4666-8666-666666666662',
   '44444444-4444-4444-8444-444444444441', 'teacher',
   null,
   '11111111-1111-4111-8111-111111111111', 'Course Instructor', false, true),
  -- Bilal: 2 roles
  ('66666666-6666-4666-8666-666666666663',
   '44444444-4444-4444-8444-444444444442', 'teacher',
   null,
   '11111111-1111-4111-8111-111111111112', 'Course Instructor', true, true),
  ('66666666-6666-4666-8666-666666666664',
   '44444444-4444-4444-8444-444444444442', 'lab_instructor',
   null,
   '11111111-1111-4111-8111-111111111112', 'Lab Instructor', false, true),
  -- Sana: 1 role
  ('66666666-6666-4666-8666-666666666665',
   '44444444-4444-4444-8444-444444444443', 'university_staff',
   (select id from public.positions where slug = 'coordinator'),
   null, null, true, true),
  -- Imran: 1 role
  ('66666666-6666-4666-8666-666666666666',
   '44444444-4444-4444-8444-444444444444', 'hr_staff',
   null,
   null, 'Human Resources', true, true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- course_offerings — Fall 2026 me kuch offerings — DEMO
-- -----------------------------------------------------------------------------
insert into public.course_offerings
  (id, course_id, semester_id, program_id, section, is_active)
values
  ('55555555-5555-4555-8555-555555555551',
   '33333333-3333-4333-8333-333333333331',
   (select id from public.semesters where slug = 'fall-2026'),
   '22222222-2222-4222-8222-222222222221', 'A', true),
  ('55555555-5555-4555-8555-555555555552',
   '33333333-3333-4333-8333-333333333332',
   (select id from public.semesters where slug = 'fall-2026'),
   '22222222-2222-4222-8222-222222222221', 'A', true),
  ('55555555-5555-4555-8555-555555555553',
   '33333333-3333-4333-8333-333333333333',
   (select id from public.semesters where slug = 'fall-2026'),
   '22222222-2222-4222-8222-222222222221', 'A', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- teacher_assignments — kis person ne kaunsa offering parhaya — DEMO
-- -----------------------------------------------------------------------------
insert into public.teacher_assignments
  (id, person_id, course_offering_id, category, is_active)
values
  ('77777777-7777-4777-8777-777777777771',
   '44444444-4444-4444-8444-444444444442',
   '55555555-5555-4555-8555-555555555551', 'teacher', true),
  ('77777777-7777-4777-8777-777777777772',
   '44444444-4444-4444-8444-444444444441',
   '55555555-5555-4555-8555-555555555552', 'teacher', true),
  ('77777777-7777-4777-8777-777777777773',
   '44444444-4444-4444-8444-444444444441',
   '55555555-5555-4555-8555-555555555553', 'teacher', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Sample banner notification (is_active = true) — dev me homepage par dikhega.
-- -----------------------------------------------------------------------------
insert into public.site_notifications
  (id, title, message, priority, href, cta_label, is_active, starts_at, ends_at)
values
  ('88888888-8888-4888-8888-888888888881',
   'Welcome to ProfAura',
   'We are getting ready to launch. Teacher profiles and reviews are coming soon.',
   'success', '/#how-it-works', 'See how it works', true, null, null)
on conflict (id) do update
  set title     = excluded.title,
      message   = excluded.message,
      priority  = excluded.priority,
      href      = excluded.href,
      cta_label = excluded.cta_label,
      is_active = excluded.is_active;

commit;
