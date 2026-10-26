-- Reversible, clearly labelled teacher samples. No fake student accounts/authorship.
begin;

create table if not exists public.demo_data_settings (
  id boolean primary key default true check (id),
  is_enabled boolean not null default false
);
insert into public.demo_data_settings (id) values (true) on conflict do nothing;
alter table public.demo_data_settings enable row level security;
revoke all on public.demo_data_settings from public, anon, authenticated;
grant select on public.demo_data_settings to anon, authenticated;
drop policy if exists "public demo state" on public.demo_data_settings;
create policy "public demo state" on public.demo_data_settings
  for select to anon, authenticated using (true);

-- NULL means a genuine review. A stable slot makes seeding idempotent.
alter table public.reviews add column if not exists demo_slot smallint
  check (demo_slot is null or (demo_slot between 1 and 16 and category = 'teacher'));
create unique index if not exists reviews_person_demo_slot_idx
  on public.reviews (person_id, demo_slot) where demo_slot is not null;
comment on column public.reviews.demo_slot is
  'Synthetic teacher sample slot; NULL for student reviews. Never linked to a student account.';

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
  for v_person in
    select id from public.people where primary_category = 'teacher'
      and (p_person_id is null or id = p_person_id)
  loop
    v_seed := ('x' || substr(md5(v_person.id::text), 1, 8))::bit(32)::bigint;
    v_count := (array[5, 10, 16, 8, 12, 14])[1 + (v_seed % 6)::int];
    v_comments := least(v_count, 3 + ((v_seed / 7) % 6)::int);
    for v_slot in 1..v_count loop
      v_rating := (greatest(6, least(10, 7 + ((v_seed / 13) % 3)::int
        + ((v_slot * 7 + v_seed) % 3)::int - 1)))::smallint;
      v_text := null;
      if v_slot <= v_comments then
        if v_slot % 2 = 1 then
          v_text := v_roman[1 + ((v_seed + (v_slot / 2) * 7) % 20)::int];
        else
          v_text := v_english[1 + ((v_seed / 11 + (v_slot / 2) * 7) % 20)::int];
        end if;
      end if;
      insert into public.reviews (
        person_id, category, overall_rating, comment, moderation_status,
        status, demo_slot, created_at, updated_at
      ) values (
        v_person.id, 'teacher', v_rating, v_text,
        case when v_text is null then 'none'::public.review_moderation_status
          else 'approved'::public.review_moderation_status end,
        case when v_enabled then 'published'::public.review_status
          else 'hidden'::public.review_status end,
        v_slot,
        now() - make_interval(days => 2 + v_slot * 4 + (v_seed % 17)::int),
        now() - make_interval(days => 2 + v_slot * 4 + (v_seed % 17)::int)
      ) on conflict (person_id, demo_slot) where demo_slot is not null do nothing
      returning id into v_review;
      if v_review is not null then
        insert into public.review_answers (review_id, criterion_id, star_value, bool_value)
        select v_review, c.id,
          case when c.kind = 'star' then greatest(1, least(5,
            round(v_rating / 2.0)::int + ((v_seed + v_slot + c.sort_order) % 3)::int - 1))::smallint end,
          case when c.kind = 'yes_no' then (v_seed + v_slot + c.sort_order) % 5 <> 0 end
        from public.review_criteria c where c.category = 'teacher' and c.is_active;
      end if;
    end loop;
  end loop;
end;
$$;
revoke all on function public.seed_teacher_demo_reviews(uuid) from public, anon, authenticated;

-- Hidden/removed statuses are already excluded by every public aggregate and RPC.
-- Guard against any other admin write accidentally publishing samples while OFF.
create or replace function public.guard_demo_review_visibility()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- A profile merge moves real reviews, but samples belong to their original
  -- teacher. Archive them in place to avoid duplicate slots on the kept profile.
  if tg_op = 'UPDATE' and old.demo_slot is not null
    and new.person_id is distinct from old.person_id then
    new.person_id := old.person_id;
    new.status := 'removed';
    new.is_featured := false;
  end if;
  if new.demo_slot is not null and new.status = 'published'
    and not (select is_enabled from public.demo_data_settings where id) then
    new.status := 'hidden';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_demo_review_visibility() from public, anon, authenticated;
drop trigger if exists guard_demo_review_visibility on public.reviews;
create trigger guard_demo_review_visibility before insert or update on public.reviews
  for each row execute function public.guard_demo_review_visibility();

create or replace function public.seed_new_teacher_demo_reviews()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.primary_category = 'teacher' then
    perform public.seed_teacher_demo_reviews(new.id);
  end if;
  return new;
end;
$$;
revoke all on function public.seed_new_teacher_demo_reviews() from public, anon, authenticated;
drop trigger if exists seed_teacher_demo_reviews on public.people;
create trigger seed_teacher_demo_reviews after insert or update of primary_category on public.people
  for each row execute function public.seed_new_teacher_demo_reviews();

create or replace function public.admin_set_demo_data(p_enabled boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_previous boolean;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;
  if p_enabled is null then
    raise exception 'Choose ON or OFF.' using errcode = 'invalid_parameter_value';
  end if;
  select is_enabled into v_previous from public.demo_data_settings where id for update;
  update public.demo_data_settings set is_enabled = p_enabled where id;
  if p_enabled then perform public.seed_teacher_demo_reviews(); end if;
  update public.reviews set status = case when p_enabled then 'published'::public.review_status
    else 'hidden'::public.review_status end
  where demo_slot is not null and status <> 'removed'
    and status <> case when p_enabled then 'published'::public.review_status else 'hidden'::public.review_status end;
  if v_previous is distinct from p_enabled then
    insert into public.admin_audit_log (actor_id, action, entity_type, details)
    values (auth.uid(), 'demo_data.update', 'demo_data',
      jsonb_build_object('from', v_previous, 'enabled', p_enabled));
  end if;
end;
$$;
revoke all on function public.admin_set_demo_data(boolean) from public, anon, authenticated;
grant execute on function public.admin_set_demo_data(boolean) to authenticated;

create or replace function public.admin_demo_data_state()
returns table (is_enabled boolean, teacher_count bigint, rating_count bigint, comment_count bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;
  return query select s.is_enabled, count(distinct r.person_id), count(r.id), count(r.comment)
    from public.demo_data_settings s left join public.reviews r
      on r.demo_slot is not null and r.status <> 'removed'
    where s.id group by s.is_enabled;
end;
$$;
revoke all on function public.admin_demo_data_state() from public, anon, authenticated;
grant execute on function public.admin_demo_data_state() to authenticated;

select public.seed_teacher_demo_reviews();

drop function public.person_reviews(uuid, int, int, boolean, boolean, uuid, uuid);
create function public.person_reviews(
  p_person_id     uuid,
  p_limit         int     default 10,
  p_offset        int     default 0,
  p_featured_only boolean default false,
  p_oldest_first  boolean default false,
  p_course_id     uuid    default null,
  p_semester_id   uuid    default null
)
returns table (
  review_id      uuid,
  overall_rating smallint,
  comment        text,
  is_featured    boolean,
  was_edited     boolean,
  created_at     timestamptz,
  updated_at     timestamptz,
  course_code    text,
  course_title   text,
  semester_label text,
  answers        jsonb,
  total_count    bigint,
  is_demo        boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  /*
    GUMNAAMI KA HISAAB (README §21).

    Course + semester ek review par "quasi-identifier" hai: agar kisi section me
    sirf 1-2 students ne review ki ho, to "CS-301, Fall 2025" likh dena us ek
    bande ki taraf ungli utha deta hai. Ratings public hain, magar KON ne di,
    yeh kabhi public nahi hona chahiye.

    Is liye course/semester ka label sirf tab dikhta hai jab us jorey par kam se
    kam 3 published reviews mojood hon. Isi tarah course/semester ka FILTER bhi
    sirf ussi soorat me chalta hai: chhote bucket par filter hamesha khali
    jawab deta hai, chahe review mojood ho ya na ho. Dono halat ka jawab ek
    jaisa hai, is liye filter se bhi kuch maloom nahi hota.

    Yeh sirf LABEL chhupata hai. Rating aur text wese hi public rehte hain.
  */
  with base as (
    select
      r.id,
      r.demo_slot,
      r.overall_rating,
      r.comment,
      r.moderation_status,
      r.is_featured,
      r.edit_count,
      r.created_at,
      r.updated_at,
      r.course_id,
      r.semester_id,
      count(*) over (partition by r.course_id, r.semester_id) as bucket_size
    from public.reviews r
    join public.people p on p.id = r.person_id and p.is_active
    where r.person_id = p_person_id
      and r.status = 'published'
  )
  select
    b.id,
    b.overall_rating,
    -- YAHI woh jagah hai jahan §22 lagta hai: bina approval ke text null hai.
    case when b.moderation_status = 'approved' then b.comment end,
    b.is_featured,
    b.edit_count > 0,
    b.created_at,
    b.updated_at,
    case when b.bucket_size >= 3 then c.code  end,
    case when b.bucket_size >= 3 then c.title end,
    case when b.bucket_size >= 3 then s.label end,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'key',   cr.key,
            'label', cr.label,
            'kind',  cr.kind,
            'star',  a.star_value,
            'yes',   a.bool_value
          )
          order by cr.sort_order
        ),
        '[]'::jsonb
      )
      from public.review_answers a
      join public.review_criteria cr on cr.id = a.criterion_id
      where a.review_id = b.id
    ),
    -- Window function LIMIT se pehle chalta hai, is liye yeh poora total deta hai.
    count(*) over (),
    b.demo_slot is not null
  from base b
  left join public.courses   c on c.id = b.course_id
  left join public.semesters s on s.id = b.semester_id
  where (not p_featured_only or b.is_featured)
    and (p_course_id   is null or (b.course_id   = p_course_id   and b.bucket_size >= 3))
    and (p_semester_id is null or (b.semester_id = p_semester_id and b.bucket_size >= 3))
  order by
    case when p_oldest_first then b.created_at end asc,
    case when p_oldest_first then null else b.created_at end desc,
    b.id
  -- Client jo bhi bheje, page ki lambai yahan band hai. README §23: kabhi
  -- saari reviews ek saath browser me mat bhejo.
  limit  least(greatest(coalesce(p_limit, 10), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
revoke all on function public.person_reviews(uuid, int, int, boolean, boolean, uuid, uuid) from public, anon, authenticated;
grant execute on function public.person_reviews(uuid, int, int, boolean, boolean, uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
