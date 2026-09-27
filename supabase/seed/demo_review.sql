-- =============================================================================
-- ProfAura - DEMO REVIEW seed (sample data) - NOT for production
-- -----------------------------------------------------------------------------
-- Maqsad: platform ka review flow end-to-end dikhana. Yeh ek mukammal published
-- review seed karta hai:
--   demo student (auth user)  ->  review row  ->  private author mapping
--   ->  har active faculty criterion ka jawab (stars + yes/no)
--
-- DEPENDENCY: pehle `supabase/seed/seed_dev.sql` chalayein - us se demo person
-- "Ayesha Khan" (faculty) aur baaqi directory aati hai. review_criteria khud
-- migration 0006 se aati hain, is liye wo hamesha maujood hoti hain.
--
-- PROD par NA chalayein. Yeh sirf local/dev demonstration ke liye hai.
-- Chalao (dev):  SQL editor me paste karke ek dev project par run karein.
--
-- Idempotent: fixed UUIDs aur "not exists" guards, is liye dobara chalana safe.
--
-- NOTE (auth user): neeche auth.users me seed karte waqt encrypted_password ke
-- liye crypt()/gen_salt() (pgcrypto) chahiye - Supabase par by default maujood
-- hai. Agar demo student se login karna maqsad nahi, to password wali line hata
-- di ja sakti hai; review flow phir bhi kaam karega.
-- =============================================================================

begin;

do $$
declare
  -- Fixed ids taake FKs wire hon aur seed idempotent rahe.
  v_author  uuid := 'a5e0d000-0000-4000-8000-000000000001';
  v_person  uuid := '44444444-4444-4444-8444-444444444441';  -- Ayesha Khan (faculty) - seed_dev.sql se
  v_review  uuid := 'e5e0d000-0000-4000-8000-000000000001';
  v_smiu    uuid;
begin
  -- Guard: agar demo person maujood nahi to saaf message do (seed_dev pehle chalao).
  if not exists (select 1 from public.people where id = v_person) then
    raise exception 'Demo person % missing. Pehle supabase/seed/seed_dev.sql chalayein.', v_person;
  end if;

  select id into v_smiu from public.universities where slug = 'smiu';

  -- ---------------------------------------------------------------------------
  -- 1) Demo student auth user. BEFORE INSERT trigger domain (smiu.edu.pk) verify
  --    karega; AFTER INSERT trigger profile row khud bana dega.
  --    Token columns ko '' set kar rahe hain taake har GoTrue version par insert
  --    chale (kuch versions me yeh NOT NULL bina default hote hain).
  -- ---------------------------------------------------------------------------
  if not exists (select 1 from auth.users where id = v_author) then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', v_author, 'authenticated', 'authenticated',
      'demo.student@smiu.edu.pk',
      crypt('DemoStudent!123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      '', '', '', '',
      now(), now()
    );
  end if;

  -- Safety net: agar kisi wajah se profile trigger na chala ho to yaqeeni banao.
  -- Role hamesha 'student' (koi escalation nahi).
  insert into public.profiles (id, university_id, email, role)
  select v_author, v_smiu, 'demo.student@smiu.edu.pk', 'student'
  where not exists (select 1 from public.profiles where id = v_author);

  -- ---------------------------------------------------------------------------
  -- 2) Review row (published). Yaad rahe: reviews table me author ka column HAI
  --    HI NAHI - anonymity structure se aati hai. Comment 20-2000 chars hona hai.
  -- ---------------------------------------------------------------------------
  insert into public.reviews (id, person_id, category, overall_rating, comment, status)
  select
    v_review, v_person, 'faculty', 5,
    'Very supportive during office hours and explains research topics clearly. '
    || 'Grading felt fair and consistent, and emails were usually answered within a day.',
    'published'
  where not exists (select 1 from public.reviews where id = v_review);

  -- ---------------------------------------------------------------------------
  -- 3) Private author mapping. unique (author_id, person_id) = ek banda ek review.
  -- ---------------------------------------------------------------------------
  insert into public.review_authors (review_id, author_id, person_id)
  select v_review, v_author, v_person
  where not exists (select 1 from public.review_authors where review_id = v_review);

  -- ---------------------------------------------------------------------------
  -- 4) Har active FACULTY criterion ka jawab. star criteria par star_value,
  --    yes_no criteria par bool_value - table check exactly ek non-null maangta hai.
  --    Keys migration 0006 se: academic_support, responsiveness, fairness,
  --    professionalism (star) + available_hours, would_recommend (yes_no).
  -- ---------------------------------------------------------------------------
  insert into public.review_answers (review_id, criterion_id, star_value, bool_value)
  select
    v_review,
    c.id,
    case when c.kind = 'star' then
      case c.key
        when 'academic_support' then 5
        when 'responsiveness'   then 5
        when 'fairness'         then 4
        when 'professionalism'  then 5
        else 4
      end
    end,
    case when c.kind = 'yes_no' then
      case c.key
        when 'available_hours' then true
        when 'would_recommend' then true
        else true
      end
    end
  from public.review_criteria c
  where c.category = 'faculty'
    and c.is_active
    and not exists (
      select 1 from public.review_answers a
       where a.review_id = v_review and a.criterion_id = c.id
    );
end
$$;

commit;

-- =============================================================================
-- Verify (optional, dev):
--   select overall_rating, status, left(comment, 40) from public.reviews
--    where person_id = '44444444-4444-4444-8444-444444444441';
--   select count(*) from public.review_answers
--    where review_id = 'e5e0d000-0000-4000-8000-000000000001';   -- expect 6
--
-- Note: public profile par course/semester labels tab dikhte hain jab kisi bucket
-- me 3+ reviews hon (k-anonymity brake). Ek review se overall + per-criterion
-- summary dikhega, magar course/semester breakdown abhi chhupa rahega - yeh
-- design ke mutabiq hai.
-- =============================================================================
