-- =============================================================================
-- 20260922090000_criteria_english_and_student_domain.sql
--
-- CORRECTIVE migration. Yeh kisi purani migration ko dobara nahi chalati, koi
-- table drop nahi karti, koi review delete nahi karti. Sirf do ghaltiyan theek
-- karti hai:
--
--   1) `review_criteria.help_text` me Roman Urdu likha tha. Roman Urdu sirf
--      SOURCE CODE comments ke liye hai. Database ka label/help_text user ko
--      screen par dikhta hai, is liye wo hamesha English hona chahiye.
--
--   2) Criteria README (§15-§19) se match nahi kar rahe the. Ab har category ke
--      sawal wahi hain jo README me tay hue hain.
--
--   3) Saath me ek zaroori fix: student email domain. README §11 ke mutabiq
--      Student ID se `bit23f011@stu.smiu.edu.pk` banti hai, magar Phase 2 seed
--      me sirf `smiu.edu.pk` tha. `enforce_university_email()` exact match
--      karta hai, is liye is ke baghair HAR signup DB par reject hota.
--      Yahan domain ADD kiya ja raha hai, purana hataya NAHI ja raha.
--
-- SAFETY:
--   * Koi criterion HARD DELETE nahi hota (README §20). Jo ab list me nahi,
--     usay sirf `is_active = false` kiya jata hai, taake purane reviews ke
--     answers apna asli sawal na kho dein.
--   * `kind` sirf naye row par set hota hai. Jo criterion pehle se mojood hai
--     us ka kind chhua tak nahi jata, warna uske purane answers ka matlab
--     badal jata.
--   * Is migration me koi nayi function nahi banti, is liye koi naya grant
--     revoke karne ki zaroorat nahi. Jo grants pehle se hain wo waise hi hain.
--   * Poori migration idempotent hai: dobara chala do to natija wahi rahega.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Student email domain ko ADDITIVELY add karo.
--    array_append nahi, kyunki dobara chalne par duplicate ban jata. Pehle
--    check karte hain ke domain pehle se to nahi.
-- -----------------------------------------------------------------------------
update public.universities
   set email_domains = email_domains || array['stu.smiu.edu.pk']
 where slug = 'smiu'
   and not ('stu.smiu.edu.pk' = any (email_domains));

-- -----------------------------------------------------------------------------
-- 2) Canonical criteria (README §15-§19).
--
--    Overall rating JAAN BOOJH KAR yahan nahi hai: wo `reviews.overall_rating`
--    column hai, criterion nahi.
-- -----------------------------------------------------------------------------
insert into public.review_criteria (category, key, label, help_text, kind, sort_order) values
  -- ---------------------------------------------------------------- §15 teacher
  ('teacher', 'course_knowledge',        'Course knowledge',              'How well does this teacher know the subject?',          'star',   1),
  ('teacher', 'teaching_way',            'Teaching way',                  'Are topics explained in a way you can follow?',         'star',   2),
  ('teacher', 'nature',                  'Nature',                        'How respectfully does this teacher treat students?',    'star',   3),
  ('teacher', 'communication',           'Communication',                 'Are instructions, deadlines and changes made clear?',   'star',   4),
  ('teacher', 'grading',                 'Grading and marking',           'Are marks given fairly for the work submitted?',        'star',   5),
  ('teacher', 'helpfulness',             'Helpfulness and student support','Is help available when you are stuck?',                'star',   6),
  ('teacher', 'strictness',              'Strict in class',               'Answer for the class you attended, not for others.',    'yes_no', 7),
  ('teacher', 'recommend_freshers',      'Recommend for freshers',        'Would you suggest this teacher to a first-year student?','yes_no', 8),
  ('teacher', 'recommend_other_courses', 'Recommend for other courses',   'Would you take another course with this teacher?',      'yes_no', 9),

  -- --------------------------------------------------------- §16 lab_instructor
  -- README: lab instructor ke default sawal teacher jaise hi hain.
  ('lab_instructor', 'course_knowledge',        'Course knowledge',              'How well does this instructor know the subject?',       'star',   1),
  ('lab_instructor', 'teaching_way',            'Teaching way',                  'Are lab steps explained in a way you can follow?',      'star',   2),
  ('lab_instructor', 'nature',                  'Nature',                        'How respectfully does this instructor treat students?', 'star',   3),
  ('lab_instructor', 'communication',           'Communication',                 'Are tasks, rules and deadlines made clear?',            'star',   4),
  ('lab_instructor', 'grading',                 'Grading and marking',           'Are lab marks given fairly for the work submitted?',    'star',   5),
  ('lab_instructor', 'helpfulness',             'Helpfulness and student support','Is help available during the lab when you are stuck?', 'star',   6),
  ('lab_instructor', 'strictness',              'Strict in the lab',             'Answer for the lab you attended, not for others.',      'yes_no', 7),
  ('lab_instructor', 'recommend_freshers',      'Recommend for freshers',        'Would you suggest this instructor to a first-year student?','yes_no', 8),
  ('lab_instructor', 'recommend_other_courses', 'Recommend for other courses',   'Would you take another lab with this instructor?',      'yes_no', 9),

  -- ---------------------------------------------------------------- §17 faculty
  ('faculty', 'role_knowledge',  'Academic and role knowledge',     'Does this person know their subject and their role well?',  'star', 1),
  ('faculty', 'nature',          'Nature and professional behaviour','How respectfully are students treated?',                    'star', 2),
  ('faculty', 'communication',   'Communication',                   'Is information given clearly and without confusion?',       'star', 3),
  ('faculty', 'responsiveness',  'Responsiveness',                  'How quickly do you get a reply or a decision?',             'star', 4),
  ('faculty', 'helpfulness',     'Helpfulness and student support',  'Is real help given when a student asks for it?',           'star', 5),
  ('faculty', 'fairness',        'Fairness',                        'Are all students treated by the same standard?',            'star', 6),
  ('faculty', 'leadership',      'Leadership and administration',   'Is the department or activity run in an organised way?',    'star', 7),

  -- ------------------------------------------------------- §18 university_staff
  ('university_staff', 'nature',            'Nature and respect',            'Are students spoken to politely?',                     'star', 1),
  ('university_staff', 'communication',     'Communication',                 'Is the answer you get clear and complete?',            'star', 2),
  ('university_staff', 'helpfulness',       'Helpfulness',                   'Do you get real help with what you came for?',         'star', 3),
  ('university_staff', 'responsiveness',    'Responsiveness',                'How quickly is your request handled?',                 'star', 4),
  ('university_staff', 'professionalism',   'Professionalism',               'Is the work done properly and without favouritism?',   'star', 5),
  ('university_staff', 'process_knowledge', 'Guidance and process knowledge','Do they know the correct procedure and explain it?',   'star', 6),

  -- --------------------------------------------------------------- §19 hr_staff
  ('hr_staff', 'professionalism',  'Professionalism',  'Is the matter handled properly and kept private?',       'star', 1),
  ('hr_staff', 'communication',    'Communication',    'Is the answer you get clear and complete?',              'star', 2),
  ('hr_staff', 'responsiveness',   'Responsiveness',   'How quickly do you get a reply?',                        'star', 3),
  ('hr_staff', 'helpfulness',      'Helpfulness',      'Do you get real help with what you came for?',           'star', 4),
  ('hr_staff', 'fairness',         'Fairness',         'Are all students treated by the same standard?',         'star', 5),
  ('hr_staff', 'issue_resolution', 'Issue resolution', 'Does the problem actually get closed, not just passed on?','star', 6)
on conflict (category, key) do update
   set label      = excluded.label,
       help_text  = excluded.help_text,
       sort_order = excluded.sort_order,
       is_active  = true;
       -- `kind` yahan JAAN BOOJH KAR update nahi hota. Ek mojood criterion ka
       -- kind badalna uske purane answers ko jhoota bana deta.

-- -----------------------------------------------------------------------------
-- 3) Purane criteria ko ARCHIVE karo (delete nahi).
--    README §20: jo criterion use ho chuka hai usay hard delete nahi karna.
--    Deactivate karne se naya review form unko nahi dikhata, magar purane
--    answers ka sawal mehfooz reh jata hai.
--
--    Saath hi in ka Roman Urdu help_text bhi saaf kiya ja raha hai, taake DB me
--    kahin bhi user-facing Roman Urdu baqi na rahe.
-- -----------------------------------------------------------------------------
update public.review_criteria
   set is_active = false,
       help_text = null
 where (category, key) not in (
         ('teacher',         'course_knowledge'),
         ('teacher',         'teaching_way'),
         ('teacher',         'nature'),
         ('teacher',         'communication'),
         ('teacher',         'grading'),
         ('teacher',         'helpfulness'),
         ('teacher',         'strictness'),
         ('teacher',         'recommend_freshers'),
         ('teacher',         'recommend_other_courses'),
         ('lab_instructor',  'course_knowledge'),
         ('lab_instructor',  'teaching_way'),
         ('lab_instructor',  'nature'),
         ('lab_instructor',  'communication'),
         ('lab_instructor',  'grading'),
         ('lab_instructor',  'helpfulness'),
         ('lab_instructor',  'strictness'),
         ('lab_instructor',  'recommend_freshers'),
         ('lab_instructor',  'recommend_other_courses'),
         ('faculty',         'role_knowledge'),
         ('faculty',         'nature'),
         ('faculty',         'communication'),
         ('faculty',         'responsiveness'),
         ('faculty',         'helpfulness'),
         ('faculty',         'fairness'),
         ('faculty',         'leadership'),
         ('university_staff','nature'),
         ('university_staff','communication'),
         ('university_staff','helpfulness'),
         ('university_staff','responsiveness'),
         ('university_staff','professionalism'),
         ('university_staff','process_knowledge'),
         ('hr_staff',        'professionalism'),
         ('hr_staff',        'communication'),
         ('hr_staff',        'responsiveness'),
         ('hr_staff',        'helpfulness'),
         ('hr_staff',        'fairness'),
         ('hr_staff',        'issue_resolution')
       );

commit;

-- =============================================================================
-- Is migration ke baad:
--   * DB me koi user-facing Roman Urdu text nahi bacha.
--   * Har category ke sawal README §15-§19 ke mutabiq hain.
--   * Purana koi criterion delete nahi hua, sirf archive (is_active = false).
--   * SMIU ke liye dono domains valid hain: smiu.edu.pk aur stu.smiu.edu.pk.
--   * Koi RLS policy, grant, ya function nahi badli.
-- =============================================================================
