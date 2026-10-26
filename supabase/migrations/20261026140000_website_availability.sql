-- Reversible website availability and a configurable public closure message.
begin;

create table if not exists public.website_availability (
  id boolean primary key default true check (id),
  is_enabled boolean not null default true,
  greeting text not null default 'Hello, SMIU community.' check (char_length(greeting) <= 180),
  title text not null default 'This website has officially closed.' check (char_length(btrim(title)) between 1 and 180),
  message text not null default 'Thank you for sharing your experiences and helping build this community. The website is now closed and its pages are no longer available.' check (char_length(btrim(message)) between 1 and 3000),
  farewell text not null default 'Goodbye, and thank you for being part of our journey.' check (char_length(farewell) <= 280),
  signature text not null default 'SMIU Feedback Platform' check (char_length(signature) <= 180),
  updated_at timestamptz not null default now()
);
insert into public.website_availability (id) values (true) on conflict do nothing;
alter table public.website_availability enable row level security;
revoke all on public.website_availability from public, anon, authenticated;
grant select on public.website_availability to anon, authenticated;
drop policy if exists "public website availability" on public.website_availability;
create policy "public website availability" on public.website_availability for select to anon, authenticated using (true);

create or replace function public.admin_website_availability()
returns setof public.website_availability
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;
  return query select * from public.website_availability where id;
end;
$$;
revoke all on function public.admin_website_availability() from public, anon, authenticated;
grant execute on function public.admin_website_availability() to authenticated;

create or replace function public.admin_update_website_availability(
  p_is_enabled boolean default null,
  p_greeting text default null,
  p_title text default null,
  p_message text default null,
  p_farewell text default null,
  p_signature text default null
)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_before public.website_availability; v_after public.website_availability;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'You do not have access to this.' using errcode = 'insufficient_privilege';
  end if;
  select * into strict v_before from public.website_availability where id for update;
  v_after := v_before;
  v_after.is_enabled := coalesce(p_is_enabled, v_before.is_enabled);
  v_after.greeting := coalesce(btrim(p_greeting), v_before.greeting);
  v_after.title := coalesce(btrim(p_title), v_before.title);
  v_after.message := coalesce(btrim(p_message), v_before.message);
  v_after.farewell := coalesce(btrim(p_farewell), v_before.farewell);
  v_after.signature := coalesce(btrim(p_signature), v_before.signature);
  if char_length(v_after.title) not between 1 and 180
    or char_length(v_after.message) not between 1 and 3000
    or char_length(v_after.greeting) > 180 or char_length(v_after.farewell) > 280
    or char_length(v_after.signature) > 180 then
    raise exception 'Please check the message fields and their length limits.' using errcode = 'check_violation';
  end if;
  if v_after is distinct from v_before then
    update public.website_availability set
      is_enabled = v_after.is_enabled, greeting = v_after.greeting,
      title = v_after.title, message = v_after.message,
      farewell = v_after.farewell, signature = v_after.signature, updated_at = now()
    where id;
    insert into public.admin_audit_log (actor_id, action, entity_type, details)
    values (auth.uid(), 'website_availability.update', 'website_availability',
      jsonb_build_object('from_enabled', v_before.is_enabled, 'enabled', v_after.is_enabled,
        'message_changed', (v_after.greeting, v_after.title, v_after.message, v_after.farewell, v_after.signature)
          is distinct from (v_before.greeting, v_before.title, v_before.message, v_before.farewell, v_before.signature)));
  end if;
end;
$$;
revoke all on function public.admin_update_website_availability(boolean, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_update_website_availability(boolean, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
commit;
