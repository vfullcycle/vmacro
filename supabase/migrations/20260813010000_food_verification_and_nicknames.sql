-- DF6: creator nickname defaults + admin verification badge on custom foods

-- 1. New profile default: nickname defaults to the email prefix (before @), not the
-- full email — still editable by the user afterwards in Settings → Profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

-- Backfill existing profiles whose display_name is still a full email (created before
-- this change) down to just the prefix. Idempotent — a second run finds nothing left.
update public.profiles
set display_name = split_part(display_name, '@', 1)
where display_name like '%@%';

-- 2. Admin flag — only วี is seeded as admin. Everyone else defaults to false.
alter table public.profiles add column is_admin boolean not null default false;
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'rtatwp@gmail.com');

-- 3. Verified flag on custom_foods — set only via set_food_verified() below, never
-- directly through the normal creator-write RLS policy (a creator must not be able to
-- self-verify their own food).
alter table public.custom_foods add column is_verified boolean not null default false;

create or replace function public.set_food_verified(food_id uuid, verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'not authorized';
  end if;
  update public.custom_foods set is_verified = verified where id = food_id;
end;
$$;

grant execute on function public.set_food_verified(uuid, boolean) to authenticated;

-- 4. Bulk display-name lookup for search result lists (avoids one RPC round-trip per row).
create or replace function public.get_display_names(profile_ids uuid[])
returns table(id uuid, display_name text)
language sql
security definer
set search_path = public
stable
as $$
  select id, display_name from public.profiles where id = any(profile_ids);
$$;

grant execute on function public.get_display_names(uuid[]) to anon, authenticated;
