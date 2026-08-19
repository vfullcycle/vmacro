-- Day-type energy target (D-019, FR-CALC-4, P4a)
-- Per-day training/rest classification that layers an allowance on top of the existing
-- goal-adjusted target (FR-CALC-1/2/3) — rest day (allowance 0) is identical to today's
-- target, so nothing changes for a profile until the user actually picks a day type.

alter table public.profiles
  add column default_day_type text check (default_day_type in ('rest', 'light', 'hard')),
  add column day_type_allowance_rest_kcal numeric,
  add column day_type_allowance_light_kcal numeric,
  add column day_type_allowance_hard_kcal numeric,
  add column carb_floor_g numeric,
  add column carb_floor_pct numeric,
  add column fat_floor_g_per_kg numeric,
  add column fat_floor_pct numeric;

-- One day-type choice per user per calendar date — separate from diary_entries because
-- it's a property of the day itself, not any one meal entry, and needs to exist even
-- before the first entry of the day is logged.
create table public.diary_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  day_type text not null check (day_type in ('rest', 'light', 'hard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create trigger diary_days_set_updated_at
  before update on public.diary_days
  for each row execute function public.set_updated_at();

alter table public.diary_days enable row level security;

create policy diary_days_all_own on public.diary_days for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
