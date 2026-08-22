-- FR-FRIEND-3: positive-only activity events in the Friends feed. Three different dedup
-- semantics live in one table (see REQUIREMENTS.md FR-FRIEND-3 for why they're not the same
-- constraint): all_meals_logged/protein_goal_hit are once-per-day, streak_milestone is
-- once-per-milestone-number ever (not tied to a date — see the "highest unclaimed
-- milestone" logic below), food_verified is once-per-food ever.

alter table public.profiles add column share_activity boolean not null default true;

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('all_meals_logged', 'streak_milestone', 'protein_goal_hit', 'food_verified')),
  occurred_on date not null,
  milestone_days integer,
  food_id uuid references public.custom_foods(id) on delete set null,
  food_name text,
  created_at timestamptz not null default now()
);

create unique index activity_events_daily_unique on public.activity_events(user_id, event_type, occurred_on)
  where event_type in ('all_meals_logged', 'protein_goal_hit');

-- Milestone numbers are awarded at most once per user ever, regardless of when — a later
-- streak that regrows through 7 again after breaking gets a new occurred_on but the same
-- milestone_days would violate this, which is intentional: "7-day streak" is a one-time
-- badge, not something you re-earn every time you pass through it.
create unique index activity_events_streak_unique on public.activity_events(user_id, milestone_days)
  where event_type = 'streak_milestone';

create unique index activity_events_food_verified_unique on public.activity_events(food_id)
  where event_type = 'food_verified';

alter table public.activity_events enable row level security;

-- Always see your own events regardless of your own share_activity setting (turning
-- sharing off hides them from others, not from yourself) — see everyone else's only if
-- *their* share_activity is on. Enforced here, not as a client-side filter, because a
-- client filter would still leak the data to anyone reading the network response directly.
create policy activity_events_select on public.activity_events for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = activity_events.user_id and p.share_activity = true));

-- food_verified is deliberately excluded — that one only ever gets inserted by
-- set_food_verified() below (SECURITY DEFINER, bypasses this policy), never directly by a
-- client claiming their own food got verified.
create policy activity_events_insert_own on public.activity_events for insert to authenticated
  with check (user_id = auth.uid() and event_type in ('all_meals_logged', 'streak_milestone', 'protein_goal_hit'));

-- Extends the existing set_food_verified() (D-017) to also record a food_verified activity
-- event for the food's creator (not the admin calling this) — only on a real false->true
-- transition, so toggling verified off and back on doesn't re-fire it.
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
  end if;
end;
$$;
