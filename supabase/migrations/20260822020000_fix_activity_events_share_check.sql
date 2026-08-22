-- Fix (found during FR-FRIEND-3 dogfood, 2026-08-22): activity_events_select's exists-subquery
-- against public.profiles was itself subject to profiles' own RLS (profiles_all_own:
-- `id = auth.uid()`), which only lets a user read their OWN profile row. That meant the
-- subquery checking *another* user's share_activity always returned no rows regardless of the
-- actual value — nobody could ever see anyone else's activity event, even with sharing on.
-- Same class of problem get_display_names()/set_food_verified() already work around: read a
-- SECURITY DEFINER function instead of querying the RLS-protected table directly.

create or replace function public.profile_shares_activity(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select share_activity from public.profiles where id = target_user_id), false);
$$;

grant execute on function public.profile_shares_activity(uuid) to authenticated;

drop policy activity_events_select on public.activity_events;

create policy activity_events_select on public.activity_events for select to authenticated
  using (user_id = auth.uid() or public.profile_shares_activity(user_id));
