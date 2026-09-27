-- =============================================================================
-- ProfAura — Internal Teacher -> Faculty association (README §27, §30, §32)
-- =============================================================================
-- MAQSAD:
--   README §27: ONE PERSON = ONE PUBLIC PROFILE. Ek internal teacher jo faculty
--   bhi hai, uska DOOSRA person record nahi banega. Uske badle usi person par
--   ek aur ROLE (category = 'faculty') laga diya jata hai.
--
--   README §30: Teacher Type teen hain — Internal, External, Corporate. Agar
--   Internal ho to:
--     * person khud-ba-khud Faculty se associate ho jaye
--     * Position dikhe
--     * Department lazmi ho
--
--   README §32: Lab Instructor par Teacher Type zabardasti nahi lagti, is liye
--   yeh column nullable hai.
--
-- ASOOL:
--   Yeh association FRONTEND ka kaam nahi. Trigger DB me hai, is liye chahe row
--   admin UI se aaye, SQL editor se, ya kisi script se — nateeja wahi rehta hai.
--
-- DATA SAFETY:
--   Sab kuch additive hai. Naya enum, do naye nullable/default columns, aur
--   trigger. Koi purana column ya row nahi chhoori jati. Maujooda har person ka
--   teacher_type NULL hai, is liye yeh migration kisi purani row par koi
--   exception nahi girati.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) teacher_type enum
-- -----------------------------------------------------------------------------
-- `create type ... if not exists` hota hi nahi, is liye duplicate ko pakarte hain.
do $$
begin
  create type public.teacher_type as enum ('internal', 'external', 'corporate');
exception
  when duplicate_object then null;
end
$$;

-- -----------------------------------------------------------------------------
-- 2) Naye columns
-- -----------------------------------------------------------------------------
alter table public.people
  add column if not exists teacher_type public.teacher_type;

comment on column public.people.teacher_type is
  'README §30. Sirf parhane walon par maani rakhta hai; Lab Instructor par lazmi nahi (§32).';

/*
  is_auto = yeh role kisi insaan ne nahi, is trigger ne banaya tha.

  Yeh flag is liye chahiye ke jab teacher internal na rahe to hum SIRF apna
  banaya hua faculty role hatayein. Admin ne khud jo faculty role banaya ho, wo
  hargiz na chhirhe.
*/
alter table public.person_roles
  add column if not exists is_auto boolean not null default false;

comment on column public.person_roles.is_auto is
  'true = role trigger ne banaya (internal teacher -> faculty). Admin ka banaya hua role hamesha false rehta hai.';

-- -----------------------------------------------------------------------------
-- 3) Association ka asal kaam
-- -----------------------------------------------------------------------------
/*
  Ek person ko dekho aur faculty role ko us ke teacher_type ke mutabiq theek
  kar do. Yeh function har dafa poori halat dobara banata hai (idempotent), is
  liye isay kitni bhi baar chalao, nateeja ek hi rehta hai.

  SECURITY DEFINER: trigger chahe kisi bhi role se chale, association hamesha
  lagni chahiye. Aur is function par koi execute grant nahi hai — trigger phir
  bhi chalta hai, kyunki Postgres execute ki ijazat trigger BANATE waqt dekhta
  hai, chalate waqt nahi.
*/
create or replace function public.apply_internal_teacher_faculty(p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_type          public.teacher_type;
  v_department_id uuid;
  v_position_id   uuid;
  v_has_teacher   boolean := false;
begin
  if p_person_id is null then
    return;
  end if;

  select p.teacher_type
    into v_type
    from public.people p
   where p.id = p_person_id;

  if not found then
    -- Person hi nahi raha (cascade delete). Kuch karne ko bacha nahi.
    return;
  end if;

  /*
    Department aur Position teacher wale role se aate hain, alag se nahi poochhe
    jate. Primary role ko tarjeeh, warna sab se purana.
  */
  select pr.department_id, pr.position_id, true
    into v_department_id, v_position_id, v_has_teacher
    from public.person_roles pr
   where pr.person_id = p_person_id
     and pr.category  = 'teacher'
     and pr.is_active
   order by pr.is_primary desc, pr.created_at asc
   limit 1;

  /*
    Neeche `coalesce` zaroori hai, aaram ke liye nahi: jab koi row na mile to
    plpgsql SAB targets ko NULL kar deta hai — upar likha `:= false` bhi mit
    jata hai. `v_has_teacher` yahan NULL hota hai, false nahi.
  */
  if v_type = 'internal' and coalesce(v_has_teacher, false) then
    -- README §30: Internal ke liye Department lazmi hai.
    if v_department_id is null then
      raise exception 'An internal teacher must have a department.'
        using errcode = 'check_violation';
    end if;

    /*
      Pehle APNA band kiya hua role dobara chaalu karne ki koshish.

      Yeh qadam chhorna nahi: `person_roles_unique_idx` (person, category,
      department, position) is_active ko nahi dekhta. Agar koi shakhs internal
      se external aur phir wapas internal hua, to neeche wala INSERT us SOYE
      HUE row se takra kar unique_violation dega aur poori UPDATE roll back ho
      jayegi. Is liye pehle jagao, phir hi naya banao.
    */
    update public.person_roles pr
       set is_active   = true,
           position_id = coalesce(pr.position_id, v_position_id)
     where pr.person_id = p_person_id
       and pr.category  = 'faculty'
       and pr.is_auto
       and not pr.is_active
       and pr.department_id is not distinct from v_department_id;

    /*
      Faculty role pehle se ho (chahe admin ne banaya ho) to haath mat lagao.
      Maqsad duplicate person se bachna hai, admin ka data badalna nahi.
    */
    if not exists (
      select 1
        from public.person_roles pr
       where pr.person_id = p_person_id
         and pr.category  = 'faculty'
         and pr.is_active
    ) then
      insert into public.person_roles (
        person_id, category, position_id, department_id, is_primary, is_active, is_auto
      )
      values (
        p_person_id, 'faculty', v_position_id, v_department_id, false, true, true
      )
      /*
        Aakhri hifazat: agar wahi (person, faculty, dept, position) row kisi aur
        shakal me pehle se mojood ho, to takrane ke bajaye usay chaalu kar do.
      */
      on conflict (person_id, category, department_id, position_id)
      do update set is_active = true;
    end if;

  else
    /*
      Ab internal nahi raha (ya teacher role hi nahi bacha). Sirf APNA banaya
      hua faculty role band karo. Delete nahi karte: purani reviews us role se
      judi ho sakti hain aur record mitana kabhi theek nahi.
    */
    update public.person_roles
       set is_active = false
     where person_id = p_person_id
       and category  = 'faculty'
       and is_auto
       and is_active;
  end if;
end;
$$;

comment on function public.apply_internal_teacher_faculty(uuid) is
  'Internal teacher ko usi person par faculty role deta hai (README §27, §30). Duplicate person kabhi nahi banata.';

-- -----------------------------------------------------------------------------
-- 4) Triggers
-- -----------------------------------------------------------------------------
create or replace function public.people_internal_faculty_trg()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.apply_internal_teacher_faculty(new.id);
  return null; -- AFTER trigger; return value ka koi asar nahi.
end;
$$;

comment on function public.people_internal_faculty_trg() is
  'people.teacher_type badalne par faculty association dobara lagata hai.';

create or replace function public.person_roles_internal_faculty_trg()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  /*
    SIRF teacher wale role par chalna hai.

    Yeh shart recursion ka taala bhi hai: function khud faculty ka role banata
    ya band karta hai, aur faculty ki row is trigger ko dobara nahi chalati.
  */
  if tg_op = 'DELETE' then
    if old.category = 'teacher' then
      perform public.apply_internal_teacher_faculty(old.person_id);
    end if;
    return null;
  end if;

  if new.category = 'teacher' or (tg_op = 'UPDATE' and old.category = 'teacher') then
    perform public.apply_internal_teacher_faculty(new.person_id);
  end if;

  return null;
end;
$$;

comment on function public.person_roles_internal_faculty_trg() is
  'Teacher role ka department/position/active badalne par faculty association dobara lagata hai.';

drop trigger if exists internal_teacher_faculty on public.people;
create trigger internal_teacher_faculty
  after insert or update of teacher_type on public.people
  for each row
  execute function public.people_internal_faculty_trg();

drop trigger if exists internal_teacher_faculty on public.person_roles;
create trigger internal_teacher_faculty
  after insert or update or delete on public.person_roles
  for each row
  execute function public.person_roles_internal_faculty_trg();

-- -----------------------------------------------------------------------------
-- 5) Backfill
-- -----------------------------------------------------------------------------
/*
  Abhi kisi bhi person ka teacher_type set nahi hai, is liye amalan yeh loop
  kuch nahi karta. Phir bhi likha hua hai taake agar yeh migration kisi aisi DB
  par chale jahan column pehle se bhara ho, halat wahin theek ho jaye.

  Har person apne alag sub-block me hai. Wajah: internal teacher jis ka
  department khali ho, us par function `raise exception` karti hai. Bina is
  guard ke ek adhoori purani row POORI migration gira deti. Aisi rows ko chhor
  kar aage barhte hain aur NOTICE me naam likh dete hain, taake admin unhe baad
  me theek kar sake.
*/
do $$
declare
  r       record;
  v_skip  int := 0;
begin
  for r in
    select p.id
      from public.people p
     where p.teacher_type is not null
  loop
    begin
      perform public.apply_internal_teacher_faculty(r.id);
    exception
      when others then
        v_skip := v_skip + 1;
        raise notice 'Skipped person % during internal-teacher backfill: %', r.id, sqlerrm;
    end;
  end loop;

  if v_skip > 0 then
    raise notice 'Internal-teacher backfill finished with % skipped person(s).', v_skip;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 6) Grants — STANDING RULE: pehle public/anon se sab chheeno
-- -----------------------------------------------------------------------------
/*
  Teeno functions sirf triggers se chalti hain. Kisi user ko inhein seedha
  bulane ki ijazat nahi. Trigger phir bhi chalta hai (execute ki ijazat trigger
  banate waqt dekhi jati hai, chalate waqt nahi).

  `people` aur `person_roles` par table-level select grant pehle se mojood hai,
  is liye naye columns apne aap public read me shaamil hain. Yeh theek hai:
  teacher_type aur is_auto me kisi student ki koi zaati maloomat nahi.
*/
revoke all on function public.apply_internal_teacher_faculty(uuid)    from public, anon, authenticated;
revoke all on function public.people_internal_faculty_trg()           from public, anon, authenticated;
revoke all on function public.person_roles_internal_faculty_trg()     from public, anon, authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * Internal teacher apne aap Faculty roles me bhi ginaa jata hai, magar
--     DOOSRA person record kabhi nahi banta (README §27).
--   * Internal ke liye Department lazmi hai; na ho to insert/update ruk jata
--     hai aur saaf message milta hai.
--   * Teacher Type internal se hata do to sirf trigger ka banaya hua faculty
--     role band hota hai. Admin ka banaya hua role kabhi nahi chhira jata.
--   * Lab Instructor par Teacher Type ki koi shart nahi (README §32).
-- =============================================================================
