-- Expose just the creator's display_name for a custom_food (D-014)
-- FR-FOOD-2 AC requires showing the creator's name on custom foods, but profiles
-- RLS is owner-only (FR-AUTH-1) — a plain view over profiles would still be
-- blocked by that RLS for every other viewer. SECURITY DEFINER lets this
-- function bypass RLS while only ever returning the one safe column.

create or replace function public.get_display_name(profile_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select display_name from public.profiles where id = profile_id;
$$;

grant execute on function public.get_display_name(uuid) to anon, authenticated;
