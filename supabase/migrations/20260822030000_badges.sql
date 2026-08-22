-- FR-BADGE-1: achievement badges. Badge catalog (key/threshold/copy) lives in code
-- (web/src/lib/badges.ts) — these two tables only hold per-user state. badge_key values are
-- append-only forever once shipped (CLAUDE.md §Append-only identifiers) — user_badges rows
-- reference them by text, renaming/removing a key would orphan history.

create table public.badge_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  counter_key text not null,
  current_value integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, counter_key)
);

alter table public.badge_progress enable row level security;

-- Owner-only, no exceptions — progress numbers are exactly what BL-21 forbids showing
-- across users ("ห้ามแสดงยอด/เรียงเทียบกับคนอื่น"), so there's no cross-user select to grant
-- here at all (unlike activity_events, which needs the share_activity-gated policy).
create policy badge_progress_all_own on public.badge_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

alter table public.user_badges enable row level security;

-- Also owner-only — other users never read this table directly, the "X unlocked" broadcast
-- to Friends goes through activity_events (badge_unlocked) same as every other event type.
create policy user_badges_all_own on public.user_badges for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Extend activity_events for badge_unlocked (client-inserted for self-triggered badges;
-- the one RPC-triggered badge — creator_certified, below — inserts directly via SECURITY
-- DEFINER same as food_verified already does, bypassing insert_own entirely).
alter table public.activity_events drop constraint activity_events_event_type_check;
alter table public.activity_events add constraint activity_events_event_type_check
  check (event_type in ('all_meals_logged', 'streak_milestone', 'protein_goal_hit', 'food_verified', 'badge_unlocked'));

alter table public.activity_events add column badge_key text;

create unique index activity_events_badge_unique on public.activity_events(user_id, badge_key)
  where event_type = 'badge_unlocked';

drop policy activity_events_insert_own on public.activity_events;
create policy activity_events_insert_own on public.activity_events for insert to authenticated
  with check (user_id = auth.uid() and event_type in ('all_meals_logged', 'streak_milestone', 'protein_goal_hit', 'badge_unlocked'));

-- Self-scoped only (no parameter) — this counts diary entries logged by OTHER users
-- referencing the caller's own custom_foods, which plain client queries can't do at all
-- (diary_entries RLS is owner-only per FR-AUTH-1). No creator_id argument on purpose: a
-- parameterized version would let anyone query anyone else's usage count, which is exactly
-- the comparative-number leak BL-21 forbids — hardcoding auth.uid() internally closes that
-- off structurally instead of relying on client-side discipline.
create or replace function public.count_food_usage_by_others()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from public.diary_entries de
  join public.custom_foods cf on cf.id = de.custom_food_id
  where cf.creator_id = auth.uid() and de.user_id != auth.uid();
$$;

grant execute on function public.count_food_usage_by_others() to authenticated;

-- Extend set_food_verified (D-017, already extended once for food_verified event in
-- FR-FRIEND-3) to also maintain the creator's custom_foods_verified_own_total counter and
-- unlock the one-tier "creator_certified" badge on first verification — both happen in the
-- admin's session but must apply to the creator, so they belong inside this SECURITY
-- DEFINER function same as the food_verified event insert already does.
create or replace function public.set_food_verified(food_id uuid, verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_verified boolean;
  v_creator_id uuid;
  v_name text;
  v_verified_count int;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'not authorized';
  end if;

  select is_verified, creator_id, name into v_was_verified, v_creator_id, v_name
    from public.custom_foods where id = food_id;

  update public.custom_foods set is_verified = verified where id = food_id;

  if verified and not coalesce(v_was_verified, false) then
    insert into public.activity_events (user_id, event_type, occurred_on, food_id, food_name)
    values (v_creator_id, 'food_verified', current_date, food_id, v_name)
    on conflict (food_id) where event_type = 'food_verified' do nothing;

    select count(*) into v_verified_count
      from public.custom_foods where creator_id = v_creator_id and is_verified = true;

    insert into public.badge_progress (user_id, counter_key, current_value)
    values (v_creator_id, 'custom_foods_verified_own_total', v_verified_count)
    on conflict (user_id, counter_key) do update set current_value = excluded.current_value, updated_at = now();

    if v_verified_count = 1 then
      insert into public.user_badges (user_id, badge_key) values (v_creator_id, 'creator_certified')
      on conflict do nothing;
      insert into public.activity_events (user_id, event_type, occurred_on, badge_key)
      values (v_creator_id, 'badge_unlocked', current_date, 'creator_certified')
      on conflict (user_id, badge_key) where event_type = 'badge_unlocked' do nothing;
    end if;
  end if;
end;
$$;
