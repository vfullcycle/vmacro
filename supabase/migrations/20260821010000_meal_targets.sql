-- Per-meal targets (BL-10, FR-CALC-5, P4b) — splits the day-type target (FR-CALC-4) into
-- default time windows per meal, derived from wake_time/sleep_hours_target. Nullable
-- everywhere: a profile with wake_time = null gets none of this UI (AC 1), so existing
-- profiles are unaffected until the user opts in from Settings.

alter table public.profiles
  add column wake_time time,
  add column sleep_hours_target numeric not null default 8,
  -- Per-meal overrides for breakfast/lunch/dinner — {start, end} in "HH:MM", only meals
  -- the user has explicitly overridden; missing key = use the computed default. Set
  -- once, never silently recalculated when wake_time/sleep_hours_target change (AC 2).
  add column meal_time_overrides jsonb not null default '{}'::jsonb,
  add column breakfast_pct numeric not null default 25,
  add column lunch_pct numeric not null default 35,
  add column dinner_pct numeric not null default 30,
  add column snack_pct numeric not null default 10;
