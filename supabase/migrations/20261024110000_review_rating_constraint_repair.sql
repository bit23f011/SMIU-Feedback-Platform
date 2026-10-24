-- Purana 1-5 check live review submission ko rok raha tha, jabke form aur RPC 1-10 hain.
-- Sirf pehchana hua purana check hatao; saved ratings aur review questions ko na badlo.
-- Yeh poori file Supabase SQL Editor me chalao; aakhir me dono flags true honi chahiye.

begin;

lock table public.reviews in access exclusive mode;

do $$
declare
  v_legacy_definition text;
  v_range_definition text;
begin
  select lower(regexp_replace(pg_get_expr(conbin, conrelid), '[[:space:]()]', '', 'g'))
    into v_legacy_definition
    from pg_constraint
   where conrelid = 'public.reviews'::regclass
     and contype = 'c'
     and conname = 'reviews_overall_rating_check';

  if v_legacy_definition is not null
     and v_legacy_definition <> 'overall_rating>=1andoverall_rating<=5' then
    raise exception 'Unexpected legacy overall rating constraint. No changes were applied.'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  select lower(regexp_replace(pg_get_expr(conbin, conrelid), '[[:space:]()]', '', 'g'))
    into v_range_definition
    from pg_constraint
   where conrelid = 'public.reviews'::regclass
     and contype = 'c'
     and conname = 'reviews_overall_rating_range';

  if v_range_definition is not null
     and v_range_definition <> 'overall_rating>=1andoverall_rating<=10' then
    raise exception 'Unexpected current overall rating constraint. No changes were applied.'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if v_legacy_definition is not null then
    alter table public.reviews drop constraint reviews_overall_rating_check;
  end if;

  if v_range_definition is null then
    alter table public.reviews
      add constraint reviews_overall_rating_range check (overall_rating between 1 and 10);
  end if;

  -- Naya range check purane rows par bhi lagay; invalid data ho to transaction rollback ho.
  alter table public.reviews validate constraint reviews_overall_rating_range;
end
$$;

commit;

select
  exists (
    select 1 from pg_constraint
     where conrelid = 'public.reviews'::regclass
       and contype = 'c'
       and conname = 'reviews_overall_rating_range'
       and convalidated
       and lower(regexp_replace(pg_get_expr(conbin, conrelid), '[[:space:]()]', '', 'g'))
           = 'overall_rating>=1andoverall_rating<=10'
  ) as overall_rating_1_to_10_ready,
  not exists (
    select 1 from pg_constraint
     where conrelid = 'public.reviews'::regclass
       and conname = 'reviews_overall_rating_check'
  ) as legacy_1_to_5_check_removed;
