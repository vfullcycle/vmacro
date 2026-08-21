-- FR-DASH-2: feed + notification badge (BL-14 + BL-09 part 1) — a single read cursor per
-- user for "what's new since I last looked", covering admin-added food, anyone's new
-- dishes, and the user's own answered food_requests. Default now() (not null) so existing
-- profiles — and every new signup going forward — start with a clean slate instead of every
-- pre-existing custom_food/dish/answered request flooding in as "new" the moment this ships.

alter table public.profiles add column feed_last_seen_at timestamptz not null default now();

-- profiles RLS only lets a user read their own row (profiles_all_own), so a plain client
-- join from custom_foods to profiles.is_admin would silently return nothing for everyone
-- except admin themselves. SECURITY DEFINER bypasses that the same way get_display_names()
-- already does for creator-name lookups.
create or replace function public.get_new_admin_foods(since timestamptz)
returns table(id uuid, name text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select cf.id, cf.name, cf.created_at
  from public.custom_foods cf
  join public.profiles p on p.id = cf.creator_id
  where p.is_admin = true and cf.created_at > since
  order by cf.created_at desc
  limit 20;
$$;

grant execute on function public.get_new_admin_foods(timestamptz) to authenticated;
