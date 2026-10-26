-- Extend labelled demo samples to faculty, labs and HR. No rating/ranking overrides.
-- Apply AFTER 20261026100000_teacher_demo_reviews.sql; safe to reapply.
begin;

-- PostgreSQL names the original multi-column inline check "reviews_check".
-- Find its exact expression, preserving unrelated/custom validation checks.
do $$
declare v_constraint record;
begin
  for v_constraint in
    select conname from pg_constraint
    where conrelid = 'public.reviews'::regclass and contype = 'c'
      and regexp_replace(
        regexp_replace(lower(pg_get_expr(conbin, conrelid)), '::[a-z_.]+', '', 'g'),
        '[[:space:]()]', '', 'g'
      ) = 'demo_slotisnullordemo_slot>=1anddemo_slot<=16andcategory=''teacher'''
  loop
    execute format('alter table public.reviews drop constraint %I', v_constraint.conname);
  end loop;
end;
$$;
alter table public.reviews drop constraint if exists reviews_demo_slot_check;
alter table public.reviews add constraint reviews_demo_slot_check
  check (demo_slot is null or (demo_slot between 1 and 16 and category in ('teacher', 'faculty', 'lab_instructor', 'hr_staff')));
drop index if exists public.reviews_person_demo_slot_idx;
create unique index reviews_person_demo_slot_idx on public.reviews (person_id, category, demo_slot)
  where demo_slot is not null;
comment on column public.reviews.demo_slot is
  'Synthetic per-role sample slot; NULL for genuine student reviews. No student authorship.';

create or replace function public.seed_teacher_demo_reviews(p_person_id uuid default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_person record;
  v_seed bigint;
  v_count int;
  v_comments int;
  v_slot int;
  v_rating smallint;
  v_review uuid;
  v_enabled boolean;
  v_text text;
  v_roman text[] := array[
    'Concepts araam se clear ho jate hain, examples kaafi helpful thay.',
    'Class ka pace theek tha. Notes revise kar lo to topic samajh aa jata hai.',
    'Questions poochne ka chance milta tha, ye cheez achi lagi.',
    'Start mein subject mushkil laga lekin practice se kaafi behtar ho gaya.',
    'Lecture ke examples exam ki preparation mein kaam aaye.',
    'Assignments thori mehnat mangti hain but learning bhi hoti hai.',
    'Overall acha experience raha, bas revision ke liye thora aur time chahiye tha.',
    'Topic ko chotay steps mein explain karna kaafi helpful tha.',
    'Regular class attend karo to cheezen easy rehti hain.',
    'Class mein discussion hoti thi is liye bore nahi hotay thay.',
    'Notes clear thay aur important points easily mil jate thay.',
    'Agar pehle se thora parh ke jao to lecture aur acha samajh aata hai.',
    'Practical examples ki wajah se theory yaad reh gayi.',
    'Pehle kuch lectures fast lagay, baad mein pace ki aadat ho gayi.',
    'Doubts clear ho gaye thay, overall course useful laga.',
    'Class activities achi thi, khud solve karne se concepts clear hue.',
    'Presentation simple thi aur main points samajh aa gaye.',
    'Revision session kaafi kaam aya, specially difficult topics ke liye.',
    'Mehnat karni parti hai lekin end pe improvement feel hoti hai.',
    'Examples relatable thay, is liye subject interesting laga.'
  ];
  v_english text[] := array[
    'Clear explanations and useful examples. The practice questions helped a lot.',
    'A good learning experience overall. Keeping up with the weekly work made a difference.',
    'I liked having time to ask questions during class.',
    'The subject felt easier once we started working through examples.',
    'Well organised lectures. A little more revision time would have been nice.',
    'The assignments took effort but helped me understand the material.',
    'Helpful feedback on class work. I knew what to improve next time.',
    'Some topics needed extra reading, but the notes were a useful starting point.',
    'The discussions made the lectures more engaging.',
    'Practical examples were the best part of this course for me.',
    'Easy to follow if you attend regularly and revise your notes.',
    'The pace picked up near the end, so staying consistent really helped.',
    'I appreciated the step by step explanations for the harder topics.',
    'Class exercises gave me a better idea of where I needed practice.',
    'Overall a solid course experience. More worked examples would make it even better.',
    'The recap at the start of each topic was useful.',
    'I felt more confident with the subject by the end of the semester.',
    'Good balance between explaining the topic and letting us try it ourselves.',
    'The material was manageable with regular practice.',
    'Really liked the way class questions connected back to the main concepts.'
  ];
begin
  -- Serialise seed/toggle operations, including a teacher created during a toggle.
  select is_enabled into v_enabled from public.demo_data_settings where id for update;
  -- Samples for a removed role stay removed, including across future ON toggles.
  update public.reviews r set status = 'removed', is_featured = false
    where r.demo_slot is not null and r.status <> 'removed'
      and (p_person_id is null or r.person_id = p_person_id)
      and not exists (select 1 from public.person_roles pr join public.people p on p.id = pr.person_id
        where pr.person_id = r.person_id and pr.category = r.category and pr.is_active and p.is_active);
  for v_person in
    select distinct p.id, pr.category from public.people p
      join public.person_roles pr on pr.person_id = p.id and pr.is_active
      where p.is_active and pr.category in ('teacher', 'faculty', 'lab_instructor', 'hr_staff')
        and (p_person_id is null or p.id = p_person_id)
      order by p.id, pr.category
  loop
    v_roman := array[
    'Concepts araam se clear ho jate hain, examples kaafi helpful thay.',
    'Class ka pace theek tha. Notes revise kar lo to topic samajh aa jata hai.',
    'Questions poochne ka chance milta tha, ye cheez achi lagi.',
    'Start mein subject mushkil laga lekin practice se kaafi behtar ho gaya.',
    'Lecture ke examples exam ki preparation mein kaam aaye.',
    'Assignments thori mehnat mangti hain but learning bhi hoti hai.',
    'Overall acha experience raha, bas revision ke liye thora aur time chahiye tha.',
    'Topic ko chotay steps mein explain karna kaafi helpful tha.',
    'Regular class attend karo to cheezen easy rehti hain.',
    'Class mein discussion hoti thi is liye bore nahi hotay thay.',
    'Notes clear thay aur important points easily mil jate thay.',
    'Agar pehle se thora parh ke jao to lecture aur acha samajh aata hai.',
    'Practical examples ki wajah se theory yaad reh gayi.',
    'Pehle kuch lectures fast lagay, baad mein pace ki aadat ho gayi.',
    'Doubts clear ho gaye thay, overall course useful laga.',
    'Class activities achi thi, khud solve karne se concepts clear hue.',
    'Presentation simple thi aur main points samajh aa gaye.',
    'Revision session kaafi kaam aya, specially difficult topics ke liye.',
    'Mehnat karni parti hai lekin end pe improvement feel hoti hai.',
    'Examples relatable thay, is liye subject interesting laga.'
  ];
    v_english := array[
    'Clear explanations and useful examples. The practice questions helped a lot.',
    'A good learning experience overall. Keeping up with the weekly work made a difference.',
    'I liked having time to ask questions during class.',
    'The subject felt easier once we started working through examples.',
    'Well organised lectures. A little more revision time would have been nice.',
    'The assignments took effort but helped me understand the material.',
    'Helpful feedback on class work. I knew what to improve next time.',
    'Some topics needed extra reading, but the notes were a useful starting point.',
    'The discussions made the lectures more engaging.',
    'Practical examples were the best part of this course for me.',
    'Easy to follow if you attend regularly and revise your notes.',
    'The pace picked up near the end, so staying consistent really helped.',
    'I appreciated the step by step explanations for the harder topics.',
    'Class exercises gave me a better idea of where I needed practice.',
    'Overall a solid course experience. More worked examples would make it even better.',
    'The recap at the start of each topic was useful.',
    'I felt more confident with the subject by the end of the semester.',
    'Good balance between explaining the topic and letting us try it ourselves.',
    'The material was manageable with regular practice.',
    'Really liked the way class questions connected back to the main concepts.'
  ];
    v_seed := ('x' || substr(md5(v_person.id::text || case when v_person.category = 'teacher' then '' else ':' || v_person.category::text end), 1, 8))::bit(32)::bigint;
    v_count := (array[5, 10, 16, 8, 12, 14])[1 + (v_seed % 6)::int];
    v_comments := least(v_count, 3 + ((v_seed / 7) % 6)::int);
    -- One person has one public profile, even with teacher + faculty roles.
    -- Preserve existing comments and cap all synthetic text at eight per profile.
    v_comments := least(v_comments, greatest(0, 8 - (
      select count(comment)::int from public.reviews
      where person_id = v_person.id and demo_slot is not null and status <> 'removed'
    )));
    for v_slot in 1..v_count loop
      v_rating := (greatest(6, least(10, 7 + ((v_seed / 13) % 3)::int
        + ((v_slot * 7 + v_seed) % 3)::int - 1)))::smallint;
      v_text := null;
      if v_person.category = 'lab_instructor' then
        v_roman := array[
          'Lab tasks ko steps mein karne se concept samajh aa gaya.',
          'Practice sessions useful thay, khud try karna zaroori hai.',
          'Setup mein help mil gayi thi, phir task complete ho gaya.',
          'Instructions clear thi aur examples helpful thay.',
          'Lab ka pace theek tha, regular practice se easy laga.',
          'Doubts poochne ka time milta tha, acha experience raha.',
          'Practical work se theory ka idea aur clear hua.',
          'Lab manual revise kar lo to tasks manageable rehte hain.'
        ];
        v_english := array[
          'The lab exercises helped connect the theory to practical work.',
          'Useful practice sessions with clear steps to follow.',
          'I appreciated being able to ask questions during the practical.',
          'The setup instructions made it easier to get started.',
          'Regular practice made the tasks easier over the semester.',
          'The examples were helpful when working through the lab exercises.',
          'A good practical learning experience overall.',
          'The lab notes were a useful reference while doing the tasks.'
        ];
      elsif v_person.category = 'hr_staff' then
        v_roman := array[
          'Process samajh aa gaya tha, guidance kaafi useful thi.',
          'Required documents ki info clear mil gayi thi.',
          'Office se procedure confirm karna helpful raha.',
          'Questions ka jawab mil gaya aur next step clear tha.',
          'Overall process manageable laga, documents ready rakho.',
          'Guidance se form fill karna easy ho gaya.',
          'Information clear thi, follow up karne se kaam agay barha.',
          'Office visit se pehle requirements check karna useful hai.'
        ];
        v_english := array[
          'The guidance made the next steps easier to understand.',
          'Useful information about the required documents.',
          'The process was manageable once the requirements were clear.',
          'I found it helpful to confirm the procedure before submitting the form.',
          'My questions about the paperwork were answered clearly.',
          'Having the documents ready made the visit more straightforward.',
          'The explanation helped me understand how to follow up.',
          'Overall a helpful experience with the process.'
        ];
      end if;
      if v_slot <= v_comments then
        if v_slot % 2 = 1 then
          v_text := v_roman[1 + ((v_seed + (v_slot / 2) * 7) % array_length(v_roman, 1))::int];
        else
          v_text := v_english[1 + ((v_seed / 11 + (v_slot / 2) * 7) % array_length(v_roman, 1))::int];
        end if;
      end if;
      insert into public.reviews (
        person_id, category, overall_rating, comment, moderation_status,
        status, demo_slot, created_at, updated_at
      ) values (
        v_person.id, v_person.category, v_rating, v_text,
        case when v_text is null then 'none'::public.review_moderation_status
          else 'approved'::public.review_moderation_status end,
        case when v_enabled then 'published'::public.review_status
          else 'hidden'::public.review_status end,
        v_slot,
        now() - make_interval(days => 2 + v_slot * 4 + (v_seed % 17)::int),
        now() - make_interval(days => 2 + v_slot * 4 + (v_seed % 17)::int)
      ) on conflict (person_id, category, demo_slot) where demo_slot is not null do nothing
      returning id into v_review;
      if v_review is not null then
        insert into public.review_answers (review_id, criterion_id, star_value, bool_value)
        select v_review, c.id,
          case when c.kind = 'star' then greatest(1, least(5,
            round(v_rating / 2.0)::int + ((v_seed + v_slot + c.sort_order) % 3)::int - 1))::smallint end,
          case when c.kind = 'yes_no' then (v_seed + v_slot + c.sort_order) % 5 <> 0 end
        from public.review_criteria c where c.category = v_person.category and c.is_active;
      end if;
    end loop;
  end loop;
end;
$$;
revoke all on function public.seed_teacher_demo_reviews(uuid) from public, anon, authenticated;

create or replace function public.seed_new_teacher_demo_reviews()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.primary_category in ('teacher', 'faculty', 'lab_instructor', 'hr_staff') then
    perform public.seed_teacher_demo_reviews(new.id);
  end if;
  return new;
end;
$$;
revoke all on function public.seed_new_teacher_demo_reviews() from public, anon, authenticated;

create or replace function public.seed_role_demo_reviews()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    perform public.seed_teacher_demo_reviews(old.person_id);
    return old;
  end if;
  perform public.seed_teacher_demo_reviews(new.person_id);
  if tg_op = 'UPDATE' and old.person_id is distinct from new.person_id then
    perform public.seed_teacher_demo_reviews(old.person_id);
  end if;
  return new;
end;
$$;
revoke all on function public.seed_role_demo_reviews() from public, anon, authenticated;
drop trigger if exists seed_role_demo_reviews on public.person_roles;
create trigger seed_role_demo_reviews after insert or update or delete on public.person_roles
  for each row execute function public.seed_role_demo_reviews();

select public.seed_teacher_demo_reviews();
notify pgrst, 'reload schema';
commit;
