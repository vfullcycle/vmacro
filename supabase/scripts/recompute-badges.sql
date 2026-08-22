-- FR-BADGE-1 manual recompute/backfill. Run in Supabase SQL Editor when badge_progress/
-- user_badges are suspected to have drifted (bug, migration, bad data fix) — recomputes all
-- 8 counters from raw tables for every user, then backfills any user_badges row that should
-- exist per the recomputed counters. Deliberately does NOT insert any activity_events: this
-- is a data-repair operation, not "just achieved it" — firing events here would retroactively
-- spam the Friends feed with old achievements (FR-BADGE-1 AC 10).
--
-- Badge thresholds below duplicate BADGE_CATALOG in web/src/lib/badges.ts on purpose (this
-- script never runs in the live app, keeping it a plain standalone .sql file is simpler than
-- wiring a shared source — if you add a badge, update both places).

begin;

-- 1) Recompute the 6 simple aggregate counters (exact, unbounded — unlike the live
--    trigger-point code in badges.ts, which uses a 120-day window for performance).
insert into public.badge_progress (user_id, counter_key, current_value, updated_at)
select p.id, 'custom_foods_created_total', (select count(*) from public.custom_foods cf where cf.creator_id = p.id), now()
from public.profiles p
on conflict (user_id, counter_key) do update set current_value = excluded.current_value, updated_at = now();

insert into public.badge_progress (user_id, counter_key, current_value, updated_at)
select p.id, 'dishes_created_total', (select count(*) from public.dishes d where d.creator_id = p.id), now()
from public.profiles p
on conflict (user_id, counter_key) do update set current_value = excluded.current_value, updated_at = now();

insert into public.badge_progress (user_id, counter_key, current_value, updated_at)
select p.id, 'weight_logs_total', (select count(*) from public.weight_logs w where w.user_id = p.id), now()
from public.profiles p
on conflict (user_id, counter_key) do update set current_value = excluded.current_value, updated_at = now();

insert into public.badge_progress (user_id, counter_key, current_value, updated_at)
select p.id, 'protein_goal_hit_total',
  (select count(*) from public.activity_events ae where ae.user_id = p.id and ae.event_type = 'protein_goal_hit'), now()
from public.profiles p
on conflict (user_id, counter_key) do update set current_value = excluded.current_value, updated_at = now();

insert into public.badge_progress (user_id, counter_key, current_value, updated_at)
select p.id, 'custom_foods_verified_own_total',
  (select count(*) from public.custom_foods cf where cf.creator_id = p.id and cf.is_verified = true), now()
from public.profiles p
on conflict (user_id, counter_key) do update set current_value = excluded.current_value, updated_at = now();

insert into public.badge_progress (user_id, counter_key, current_value, updated_at)
select p.id, 'food_used_by_others_total',
  (select count(*) from public.diary_entries de join public.custom_foods cf on cf.id = de.custom_food_id
   where cf.creator_id = p.id and de.user_id != p.id),
  now()
from public.profiles p
on conflict (user_id, counter_key) do update set current_value = excluded.current_value, updated_at = now();

insert into public.badge_progress (user_id, counter_key, current_value, updated_at)
select p.id, 'diary_days_total', (select count(distinct de.entry_date) from public.diary_entries de where de.user_id = p.id), now()
from public.profiles p
on conflict (user_id, counter_key) do update set current_value = excluded.current_value, updated_at = now();

-- diary_streak_current: consecutive-day run ending exactly at CURRENT_DATE (0 if today has
-- no entry yet) — same semantics as computeStreakLength() in activityEvents.ts. Classic
-- gaps-and-islands: subtracting a per-user row number from each date groups consecutive
-- dates into the same "island"; the island containing today, if any, is the current streak.
with distinct_dates as (
  select distinct user_id, entry_date from public.diary_entries
),
islands as (
  select user_id, entry_date,
    entry_date - (row_number() over (partition by user_id order by entry_date))::int as island_key
  from distinct_dates
),
island_bounds as (
  select user_id, min(entry_date) as start_date, max(entry_date) as end_date
  from islands
  group by user_id, island_key
),
current_streaks as (
  select user_id, (end_date - start_date + 1) as streak_len
  from island_bounds
  where end_date = current_date
)
insert into public.badge_progress (user_id, counter_key, current_value, updated_at)
select p.id, 'diary_streak_current', coalesce(cs.streak_len, 0), now()
from public.profiles p
left join current_streaks cs on cs.user_id = p.id
on conflict (user_id, counter_key) do update set current_value = excluded.current_value, updated_at = now();

-- 2) Backfill user_badges for anything the recomputed counters now qualify for — silent,
--    no activity_events (see header).
with catalog(badge_key, counter_key, threshold) as (
  values
    ('first_day', 'diary_days_total', 1),
    ('week_complete', 'diary_days_total', 7),
    ('month_complete', 'diary_days_total', 30),
    ('streak_7', 'diary_streak_current', 7),
    ('streak_30', 'diary_streak_current', 30),
    ('streak_100', 'diary_streak_current', 100),
    ('foods_first', 'custom_foods_created_total', 1),
    ('foods_10', 'custom_foods_created_total', 10),
    ('foods_50', 'custom_foods_created_total', 50),
    ('creator_certified', 'custom_foods_verified_own_total', 1),
    ('foods_used_10', 'food_used_by_others_total', 10),
    ('foods_used_100', 'food_used_by_others_total', 100),
    ('dishes_1', 'dishes_created_total', 1),
    ('dishes_10', 'dishes_created_total', 10),
    ('protein_goal_7', 'protein_goal_hit_total', 7),
    ('protein_goal_30', 'protein_goal_hit_total', 30),
    ('tenure_30', 'tenure_days', 30),
    ('tenure_100', 'tenure_days', 100),
    ('tenure_365', 'tenure_days', 365),
    ('weight_logs_10', 'weight_logs_total', 10),
    ('weight_logs_50', 'weight_logs_total', 50)
),
values_per_user as (
  select user_id, counter_key, current_value from public.badge_progress
  union all
  select p.id, 'tenure_days', extract(day from now() - p.created_at)::int from public.profiles p
)
insert into public.user_badges (user_id, badge_key)
select v.user_id, c.badge_key
from values_per_user v
join catalog c on c.counter_key = v.counter_key and v.current_value >= c.threshold
on conflict (user_id, badge_key) do nothing;

commit;
