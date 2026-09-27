-- =============================================================================
-- ProfAura - moderate_review() ki hifazati durusti
-- README §22 (text moderation), §24 (backend hi aakhri authority hai)
-- =============================================================================
--
-- MASLA:
-- `admin_review_queue` apni list me se `status = 'removed'` wali reviews nikaal
-- deti hai, kyunke student ne wo khud hata di hoti hain. Magar
-- `moderate_review()` sirf `comment is not null` dekhti thi, status nahi.
--
-- Matlab: admin screen par aisi review dikhti hi nahi, magar agar koi us ka
-- review_id kahin se le kar seedha RPC maar de (DevTools, Postman), to us
-- hataayi hui review ko `approved` aur `featured` tak kiya ja sakta tha.
--
-- Abhi wo public isliye nahi hoti thi ke `person_reviews` alag se
-- `status = 'published'` filter karti hai. Yani hifazat ek GAIR-MUTALLIQ filter
-- par tiki hui thi. §24 kehta hai backend khud saaf mana kare, kisi doosri
-- jagah ki sharafat par bharosa na kare.
--
-- HAL: `moderate_review()` bhi wahi shart lagati hai jo queue lagati hai.
--
-- Yeh migration sirf ek function ko replace karti hai. Na koi table chhoti hai,
-- na koi row. `create or replace` purane grants bhi barqarar rakhta hai, phir
-- bhi neeche revoke/grant dobara likhe gaye hain (STANDING RULE).
--
-- Agar 20260922110000 abhi tak apply nahi hui, tab bhi yeh file mehfooz hai:
-- wo pehle chalti hai (naam se order lagta hai), yeh us ke baad sirf behtar
-- version rakh deti hai.

begin;

create or replace function public.moderate_review(
  p_review_id uuid,
  p_action    text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_status public.review_moderation_status;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  /*
    `status <> 'removed'` yahan ka asal farq hai.

    Student ki hataayi hui review par admin ka koi kaam nahi bacha: na approve,
    na feature. Queue usay pehle hi chhupati hai; ab function bhi mana karta
    hai, is liye seedha RPC call bhi kuch nahi kar sakta.
  */
  select r.moderation_status into v_status
    from public.reviews r
   where r.id = p_review_id
     and r.comment is not null
     and r.status <> 'removed';

  if not found then
    raise exception 'That review is not available to moderate.' using errcode = 'no_data_found';
  end if;

  if p_action = 'approve' then
    update public.reviews
       set moderation_status = 'approved',
           moderated_at      = now(),
           moderated_by      = v_uid
     where id = p_review_id;

  elsif p_action = 'reject' then
    update public.reviews
       set moderation_status = 'rejected',
           is_featured       = false,
           moderated_at      = now(),
           moderated_by      = v_uid
     where id = p_review_id;

  elsif p_action = 'hide' then
    update public.reviews
       set moderation_status = 'hidden',
           is_featured       = false,
           moderated_at      = now(),
           moderated_by      = v_uid
     where id = p_review_id;

  elsif p_action = 'feature' then
    -- Sirf approved text feature ho sakta hai (constraint bhi yehi kehti hai,
    -- magar yahan message behtar milta hai).
    if v_status <> 'approved' then
      raise exception 'Approve this review before featuring it.' using errcode = 'check_violation';
    end if;
    update public.reviews
       set is_featured  = true,
           moderated_at = now(),
           moderated_by = v_uid
     where id = p_review_id;

  elsif p_action = 'unfeature' then
    update public.reviews
       set is_featured  = false,
           moderated_at = now(),
           moderated_by = v_uid
     where id = p_review_id;

  else
    raise exception 'That action is not allowed.' using errcode = 'check_violation';
  end if;

  -- Audit log. Sirf review ka id jata hai, likhne wale ka koi zikr nahi.
  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_uid,
    'review.' || p_action,
    'review',
    p_review_id,
    jsonb_build_object('from', v_status)
  );
end;
$$;

comment on function public.moderate_review(uuid, text) is
  'Approve / reject / hide / feature / unfeature. Hataayi hui review par kuch nahi chalta. Har action audit log me jata hai (README §22).';

-- STANDING RULE: pehle sab se chheeno, phir sirf zaroori role ko wapas do.
-- `is_admin()` function ke andar phir bhi lagta hai, yeh sirf pehla darwaza hai.
revoke all on function public.moderate_review(uuid, text) from public, anon, authenticated;
grant execute on function public.moderate_review(uuid, text) to authenticated;

commit;
