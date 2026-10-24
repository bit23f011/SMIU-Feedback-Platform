-- Short experience text ko purana minimum 20-character check rok raha tha.
-- Sirf pehchani hui purani shart hatao aur mojooda 150-word limit lagao.
-- Ratings, review questions, saved text aur admin approval rules ko na badlo.
-- SQL Editor me poori file chalao; aakhir me dono flags true honi chahiye.
-- Repair ek atomic DO statement hai: pehle statement/session ki temp table par depend nahi.

do $$
declare
  v_legacy_definition text;
  v_current_definition text;
  v_expected_legacy text;
  v_expected_current text;
begin
  lock table public.reviews in access exclusive mode;

  -- Helper isi block me banao aur istemal karo; SQL Editor ke alag calls me bhi safe.
  -- Isi PostgreSQL ka canonical expression lo; casts/formatting par andaaza na lagao.
  create temporary table profaura_review_comment_policy (
    comment text,
    constraint expected_legacy_comment check (
      comment is null or char_length(btrim(comment)) between 20 and 2000
    ),
    constraint expected_comment_word_limit check (
      comment is null
      or (
        char_length(btrim(comment)) between 1 and 1500
        and coalesce(
              array_length(regexp_split_to_array(btrim(comment), '\s+'), 1),
              0
            ) between 1 and 150
      )
    )
  ) on commit drop;

  select pg_get_expr(conbin, conrelid) into v_expected_legacy
    from pg_constraint
   where conrelid = 'pg_temp.profaura_review_comment_policy'::regclass
     and conname = 'expected_legacy_comment';

  select pg_get_expr(conbin, conrelid) into v_expected_current
    from pg_constraint
   where conrelid = 'pg_temp.profaura_review_comment_policy'::regclass
     and conname = 'expected_comment_word_limit';

  select pg_get_expr(conbin, conrelid) into v_legacy_definition
    from pg_constraint
   where conrelid = 'public.reviews'::regclass
     and contype = 'c'
     and conname = 'reviews_comment_check';

  select pg_get_expr(conbin, conrelid) into v_current_definition
    from pg_constraint
   where conrelid = 'public.reviews'::regclass
     and contype = 'c'
     and conname = 'reviews_comment_word_limit';

  if v_legacy_definition is not null
     and v_legacy_definition <> v_expected_legacy then
    raise exception 'Unexpected legacy comment constraint. No changes were applied.'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if v_current_definition is not null
     and v_current_definition <> v_expected_current then
    raise exception 'Unexpected current comment constraint. No changes were applied.'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if v_legacy_definition is not null then
    alter table public.reviews drop constraint reviews_comment_check;
  end if;

  if v_current_definition is null then
    alter table public.reviews add constraint reviews_comment_word_limit check (
      comment is null
      or (
        char_length(btrim(comment)) between 1 and 1500
        and coalesce(
              array_length(regexp_split_to_array(btrim(comment), '\s+'), 1),
              0
            ) between 1 and 150
      )
    );
  end if;

  -- Agar koi purana saved text limit se bahar ho to sab rollback ho, text rewrite na ho.
  alter table public.reviews validate constraint reviews_comment_word_limit;

  -- Outer migration transaction me commit se pehle dobara run karna bhi safe ho.
  drop table pg_temp.profaura_review_comment_policy;
end
$$;

select
  exists (
    select 1 from pg_constraint
     where conrelid = 'public.reviews'::regclass
       and contype = 'c'
       and conname = 'reviews_comment_word_limit'
       and convalidated
  ) as comment_word_limit_ready,
  not exists (
    select 1 from pg_constraint
     where conrelid = 'public.reviews'::regclass
       and conname = 'reviews_comment_check'
  ) as legacy_comment_check_removed;
