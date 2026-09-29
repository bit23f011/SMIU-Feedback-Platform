-- =============================================================================
-- 20260929093000_home_images.sql
--
-- Homepage hero ki right side ke liye admin-managed images.
--
-- ISME KYA HAI:
--   1) public.home_images            - metadata rows (storage_path, alt, order,
--      is_active). Asal image bytes STORAGE me (neeche bucket), yahan sirf pointer.
--   2) HARD CAP 15                    - ek trigger jo 15 se ziyada insert rok deta
--      hai (server authority). RPC bhi pehle friendly error deta hai.
--   3) RLS                           - public sirf is_active rows parh sakta hai
--      (jaise site_notifications). Koi client write policy nahi = default deny;
--      likhna sirf neeche wale SECURITY DEFINER RPC se.
--   4) STORAGE bucket 'home-images'  - public read; likhna/mitana sirf admin
--      (storage.objects par is_admin() policy). Bytes yahan rehte hain.
--   5) RPCs                          - admin_home_image_list / admin_add_home_image
--      / admin_delete_home_image. Har ek is_admin() gate + audit.
--
-- SAFETY (README §27, §30):
--   * Koi mojooda table/data ko haath nahi. Sab naya aur additive.
--   * Har function pehla kaam is_admin() (frontend button chhupana kaafi nahi).
--   * Har function revoke-before-grant; sirf authenticated ko (andar admin gate).
--   * Cap 15 DB me (trigger) - browser me nahi.
--   * Bucket public READ hai (hero par dikhani hai); WRITE sirf admin.
--
-- APPLY NOTE (Windows owner):
--   * Yeh migration storage.objects par policies banati hai. Hosted Supabase par
--     yeh SQL editor / `supabase db push` se chal jati hai (postgres role ke paas
--     ijazat hoti hai). Agar kisi wajah se "must be owner of table objects" jaisa
--     error aaye, to sirf STORAGE wala hissa (bucket + 4 policies) Dashboard se
--     bana lena: Storage > New bucket "home-images" (Public) + policies neeche
--     comment me diye hue hain. Table + RPC wala hissa migration se chalega.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) home_images table
-- -----------------------------------------------------------------------------
create table if not exists public.home_images (
  id           uuid primary key default gen_random_uuid(),
  -- Bucket ke andar object ka path (misal: "a1b2....webp"). Bytes storage me.
  storage_path text not null unique,
  -- Optional caption / alt text (accessibility + lightbox title).
  alt_text     text,
  -- Hero par tarteeb; chhota pehle. Add par max+1.
  sort_order   integer not null default 0,
  -- Hide-without-delete ki gunjaish (abhi UI hamesha true rakhta hai).
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);

comment on table public.home_images is
  'Homepage hero ki admin-managed images (max 15). Bytes storage bucket home-images me; yahan sirf metadata. Public sirf is_active parhta hai (RLS).';

drop trigger if exists home_images_set_updated_at on public.home_images;
create trigger home_images_set_updated_at
  before update on public.home_images
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) HARD CAP 15 (server authority). RPC pehle friendly error deta hai, magar
--    yeh trigger aakhri zamaanat hai chahe kisi bhi raaste se insert ho.
-- -----------------------------------------------------------------------------
create or replace function public.enforce_home_images_cap()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.home_images) >= 15 then
    raise exception 'You can add at most 15 homepage images.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.enforce_home_images_cap() is
  'BEFORE INSERT guard: home_images me 15 se ziyada rows nahi. Server-side hard cap.';

drop trigger if exists home_images_cap on public.home_images;
create trigger home_images_cap
  before insert on public.home_images
  for each row execute function public.enforce_home_images_cap();

-- -----------------------------------------------------------------------------
-- 3) RLS: public sirf is_active parhta hai. Koi write policy nahi = default deny.
-- -----------------------------------------------------------------------------
alter table public.home_images enable row level security;

grant select on public.home_images to anon, authenticated;

drop policy if exists "public read active home images" on public.home_images;
create policy "public read active home images"
  on public.home_images for select
  to anon, authenticated
  using (is_active);

-- -----------------------------------------------------------------------------
-- 4) STORAGE bucket + policies.
--    Bucket PUBLIC read (hero par <img> se load); WRITE/DELETE sirf admin.
--    Agar yeh hissa privilege ki wajah se error de to Dashboard se bana lena
--    (upar APPLY NOTE dekho).
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('home-images', 'home-images', true)
on conflict (id) do nothing;

-- Admin upload (insert object).
drop policy if exists "home-images admin insert" on storage.objects;
create policy "home-images admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'home-images' and public.is_admin());

-- Admin overwrite (update object) - upsert ke liye.
drop policy if exists "home-images admin update" on storage.objects;
create policy "home-images admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'home-images' and public.is_admin())
  with check (bucket_id = 'home-images' and public.is_admin());

-- Admin delete object.
drop policy if exists "home-images admin delete" on storage.objects;
create policy "home-images admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'home-images' and public.is_admin());

-- Public read object (bucket public hai; yeh policy API listing/read ke liye).
drop policy if exists "home-images public read" on storage.objects;
create policy "home-images public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'home-images');

-- -----------------------------------------------------------------------------
-- 5a) admin_home_image_list - admin ko saari images (inactive bhi), tarteeb se.
--     Max 15 hain is liye pagination ki zaroorat nahi.
-- -----------------------------------------------------------------------------
create or replace function public.admin_home_image_list()
returns table (
  id           uuid,
  storage_path text,
  alt_text     text,
  sort_order   integer,
  is_active    boolean,
  created_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  return query
    select h.id, h.storage_path, h.alt_text, h.sort_order, h.is_active, h.created_at
    from public.home_images h
    order by h.sort_order, h.created_at, h.id;
end;
$$;

comment on function public.admin_home_image_list() is
  'Admin ko saari homepage images (inactive bhi), tarteeb se.';

-- -----------------------------------------------------------------------------
-- 5b) admin_add_home_image - ek metadata row add. Bytes pehle storage me upload
--     ho chuke hote hain (server action); yahan sirf pointer. Cap 15 + audit.
-- -----------------------------------------------------------------------------
create or replace function public.admin_add_home_image(
  p_storage_path text,
  p_alt_text     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_path text;
  v_alt  text;
  v_next integer;
  v_id   uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  v_path := nullif(btrim(coalesce(p_storage_path, '')), '');
  if v_path is null then
    raise exception 'An image is required.' using errcode = 'check_violation';
  end if;
  -- Path server action ne banaya (uuid.ext). Phir bhi shakal check: sirf
  -- mehfooz characters, koi path traversal nahi.
  if v_path !~ '^[a-zA-Z0-9._-]+$' or char_length(v_path) > 200 then
    raise exception 'That image could not be saved.' using errcode = 'check_violation';
  end if;

  v_alt := nullif(btrim(coalesce(p_alt_text, '')), '');
  if v_alt is not null and char_length(v_alt) > 200 then
    raise exception 'Please keep the description shorter.' using errcode = 'check_violation';
  end if;

  -- Friendly cap check (trigger bhi neeche zamaanat deta hai).
  if (select count(*) from public.home_images) >= 15 then
    raise exception 'You can add at most 15 homepage images.' using errcode = 'check_violation';
  end if;

  select coalesce(max(sort_order), 0) + 1 into v_next from public.home_images;

  insert into public.home_images (storage_path, alt_text, sort_order, created_by)
  values (v_path, v_alt, v_next, v_uid)
  returning id into v_id;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'home_image.create', 'home_image', v_id,
          jsonb_build_object('path', v_path));

  return v_id;
end;
$$;

comment on function public.admin_add_home_image(text, text) is
  'Homepage image ka metadata row add karo (bytes storage me pehle se). Cap 15, audit.';

-- -----------------------------------------------------------------------------
-- 5c) admin_delete_home_image - metadata row hatao aur storage_path WAPAS do
--     taake server action storage object bhi mita sake. Audit.
-- -----------------------------------------------------------------------------
create or replace function public.admin_delete_home_image(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_path text;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;

  delete from public.home_images
   where id = p_id
  returning storage_path into v_path;

  if v_path is null then
    raise exception 'That image is not available.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'home_image.delete', 'home_image', p_id,
          jsonb_build_object('path', v_path));

  return v_path;
end;
$$;

comment on function public.admin_delete_home_image(uuid) is
  'Homepage image metadata delete; storage_path wapas taake object bhi mit sake. Audit.';

-- -----------------------------------------------------------------------------
-- 6) Grants - STANDING RULE: pehle sab se chheeno, phir do. Trigger function ko
--    kisi client role ko execute nahi.
-- -----------------------------------------------------------------------------
revoke all on function public.enforce_home_images_cap()               from public, anon, authenticated;
revoke all on function public.admin_home_image_list()                 from public, anon, authenticated;
revoke all on function public.admin_add_home_image(text, text)        from public, anon, authenticated;
revoke all on function public.admin_delete_home_image(uuid)           from public, anon, authenticated;

grant execute on function public.admin_home_image_list()              to authenticated;
grant execute on function public.admin_add_home_image(text, text)     to authenticated;
grant execute on function public.admin_delete_home_image(uuid)        to authenticated;

commit;

-- =============================================================================
-- Is migration ke baad:
--   * Admin homepage par 15 tak images rakh sakta hai (upload/delete), jo hero
--     ki right side par apne aap badalti rehti hain (public read).
--   * Cap 15 aur admin-only writes dono DB me enforce hain (trigger + RLS +
--     SECURITY DEFINER is_admin()). Browser authority nahi.
--   * Har add/delete audit log me.
--
-- Owner (Windows) par apply ke baad tez tasdeeq (admin session me):
--   select * from public.admin_home_image_list();               -- []
--   -- Storage bucket bana? :
--   select id, public from storage.buckets where id = 'home-images';
--   -- Non-admin ko block? (koi doosra session): upload RLS se rukega.
-- =============================================================================
