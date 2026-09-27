-- =============================================================================
-- 20260925090000_compare_people_kanon_threshold.sql
--
-- CORRECTIVE (README §30): compare_people ki per-criterion values ko k-anonymity
-- threshold ke peechhe le aata hai, DB ke andar.
--
-- MASLA:
--   Pehle compare_people har criterion ka raw starResponses / yesCount /
--   boolResponses waapas kar deti thi, bina yeh dekhe ke kitne jawab hain.
--   "3 se kam jawab par number mat dikhao" wala pardah sirf UI
--   (comparison-table.tsx) me tha. compare_people anon ko bhi grant hai, is liye
--   koi seedha RPC call (DevTools / curl) karke sub-threshold counts nikaal
--   sakta tha: ek hi "No" ya n=1 star average se banda pehchana ja sakta hai.
--   Yeh structural anonymity (README §28) ke khilaf hai.
--
--   recommend_teachers pehle se hi cs.star_responses >= breakdown_min_reviews()
--   par gate karti hai. compare_people wahi asool nahi maanti thi.
--
-- HAL:
--   compare_people ko dobara banao (create or replace) taake criteria jsonb
--   sirf un criteria ko values ke sath de jinke paas kaafi jawab hain
--   (breakdown_min_reviews(), wahi admin-configurable helper jo baaki aggregates
--   use karte hain). Kam jawab wale criterion ka key/label/kind to rehta hai
--   (taake row dikh sake), magar averageStar / yesCount null aur responses 0 kar
--   diye jate hain: UI unhe pehle se "·" (not enough responses) dikhata hai, ab
--   raw number DB se nikalta hi nahi.
--
-- SAFETY (README §27):
--   * Sirf ek function ko create or replace kar raha hai. Koi table, index, ya
--     data ko haath nahi. Rerun-safe hai.
--   * Signature bilkul wahi hai (uuid[], person_category), is liye purane grants
--     qaim rehte hain. Ehtiyatan revoke/grant dobara likh diya hai.
--   * Overall rating aur review_count jaan boojh kar waise hi hain jaise poore
--     platform par (directory, profile, rankings): wo n>=1 par dikhte hain.
--     Yeh migration sirf PER-CRITERION breakdown ka wohi rule laagu karti hai jo
--     rating-summary aur recommend already maante hain.
-- =============================================================================

begin;

create or replace function public.compare_people(
  p_ids      uuid[],
  p_category public.person_category default 'teacher'
)
returns table (
  person_id        uuid,
  slug             text,
  full_name        text,
  display_name     text,
  gender           public.person_gender,
  photo_url        text,
  headline         text,
  role_title       text,
  department_short text,
  average_rating   numeric,
  review_count     int,
  criteria         jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with cfg as (
    select public.breakdown_min_reviews() as min_responses
  ),
  wanted as (
    select t.pid, min(t.ord) as ord
      from unnest(coalesce(p_ids, '{}'::uuid[])) with ordinality as t(pid, ord)
     group by t.pid
     order by min(t.ord)
     limit 4
  )
  select
    p.id,
    p.slug,
    p.full_name,
    p.display_name,
    p.gender,
    p.photo_url,
    p.headline,
    coalesce(pos.title, pr.title_override) as role_title,
    d.short_name,
    sc.avg_rating,
    coalesce(sc.n, 0),
    k.criteria
  from wanted w
  join public.people p on p.id = w.pid and p.is_active
  left join lateral (
    select pr.title_override, pr.position_id, pr.department_id
      from public.person_roles pr
     where pr.person_id = p.id
       and pr.category  = p_category
       and pr.is_active
     order by pr.is_primary desc, pr.created_at asc
     limit 1
  ) pr on true
  left join public.positions   pos on pos.id = pr.position_id
  left join public.departments d   on d.id   = pr.department_id and d.is_active
  left join lateral (
    -- Rating usi category ki reviews se, warna do alag role ka data mil jata.
    select
      count(*)::int                             as n,
      round(avg(r.overall_rating)::numeric, 2)  as avg_rating
    from public.reviews r
    where r.person_id = p.id
      and r.status    = 'published'
      and r.category  = p_category
  ) sc on true
  left join lateral (
    select coalesce(jsonb_agg(x.item order by x.sort_order), '[]'::jsonb) as criteria
    from (
      select
        cs.sort_order,
        jsonb_build_object(
          'key',   cs.key,
          'label', cs.label,
          'kind',  cs.kind::text,
          -- K-ANONYMITY BRAKE (README §28, §30): kaafi jawab na hon to number
          -- DB se nikalta hi nahi. star ke liye star_responses, yes_no ke liye
          -- bool_responses dekha jata hai. UI in ko pehle se "·" dikhata hai.
          'averageStar',
            case
              when cs.kind = 'star' and cs.star_responses >= cfg.min_responses
                then cs.average_star
              else null
            end,
          'starResponses',
            case
              when cs.kind = 'star' and cs.star_responses >= cfg.min_responses
                then cs.star_responses
              else 0
            end,
          'yesCount',
            case
              when cs.kind = 'yes_no' and cs.bool_responses >= cfg.min_responses
                then cs.yes_count
              else 0
            end,
          'boolResponses',
            case
              when cs.kind = 'yes_no' and cs.bool_responses >= cfg.min_responses
                then cs.bool_responses
              else 0
            end
        ) as item
      from public.person_criteria_stats cs
      cross join cfg
      where cs.person_id = p.id
        and cs.category  = p_category
    ) x
  ) k on true
  order by w.ord asc;
$$;

comment on function public.compare_people(uuid[], public.person_category) is
  'Side-by-side comparison (README §43). Max 4 log. Per-criterion values k-anonymity threshold (breakdown_min_reviews) ke peechhe hain: kam jawab wale criterion ka number DB se nahi nikalta.';

-- Signature wahi hai, magar STANDING RULE ke mutabiq revoke-before-grant dobara.
revoke all on function public.compare_people(uuid[], public.person_category)
  from public, anon, authenticated;
grant execute on function public.compare_people(uuid[], public.person_category)
  to anon, authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * compare_people(anon ya authenticated) ab kabhi sub-threshold per-criterion
--     count wapas nahi karti. "3 se kam jawab" ab DB me chhupta hai, sirf UI me
--     nahi. Overall rating / review count platform ke baaki hisson jaise hi hain.
--   * Koi table ya data nahi badla. Sirf ek function ki body update hui.
--
-- Owner (Windows) par apply karne ke baad tasdeeq (ek n<3 criterion wali profile
-- par):
--   select criteria from public.compare_people(array['<id1>','<id2>']::uuid[], 'teacher');
--   -- kam jawab wale criterion me averageStar null aur *Responses 0 hone chahiye.
-- =============================================================================
