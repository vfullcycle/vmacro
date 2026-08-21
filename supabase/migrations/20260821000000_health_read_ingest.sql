-- FR-HLTH-3 (P4b): Apple Health READ — Shortcut #2 posts workout/HR/active-energy data
-- here via the same opaque per-user token as FR-HLTH-1 (D-020, health_tokens table) —
-- see 20260814000000_health_tokens.sql for why token resolution and the write happen in
-- one SECURITY DEFINER function rather than a separate "resolve token -> user_id" step.
--
-- Two tables with deliberately different write semantics:
--   health_workouts    — event log, one row per workout session, insert-once (a synced
--                         workout never changes after the fact).
--   health_daily_stats — one row per (user, date), upserted — a sync later in the same
--                         day has a more complete active_energy_kcal total than a sync
--                         earlier that day, so the later sync must overwrite, not be
--                         rejected as a duplicate. synced_at records when that happened
--                         so FR-ANLT-1 can tell an early (incomplete) sync from a full one.
--
-- HRV and raw heart-rate samples are deliberately out of scope for P4 (see REQUIREMENTS.md
-- FR-HLTH-3 v1.13) — only resting HR (1/day) and per-workout average HR are stored.

create table public.health_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_type text not null,
  started_at timestamptz not null,
  duration_seconds integer not null,
  energy_kcal numeric,
  avg_heart_rate numeric,
  created_at timestamptz not null default now(),
  unique (user_id, started_at, workout_type)
);

alter table public.health_workouts enable row level security;

-- Read-only for the owning user via the normal Supabase client (FR-ANLT-1 will query
-- this) — all writes go through ingest_health_data_for_token() below, never direct
-- table access, since the Shortcut authenticates with a token, not a Supabase JWT.
create policy health_workouts_select_own on public.health_workouts
  for select to authenticated using (user_id = auth.uid());

create table public.health_daily_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  stat_date date not null,
  resting_heart_rate numeric,
  active_energy_kcal numeric,
  synced_at timestamptz not null default now(),
  primary key (user_id, stat_date)
);

alter table public.health_daily_stats enable row level security;

create policy health_daily_stats_select_own on public.health_daily_stats
  for select to authenticated using (user_id = auth.uid());

-- p_workouts: jsonb array of {type, started_at, duration_seconds, energy_kcal?, avg_heart_rate?}
-- Resting HR / active energy are optional per call — a sync that only has one or the
-- other still upserts whichever fields it has rather than requiring both every time.
create or replace function public.ingest_health_data_for_token(
  p_token text,
  p_date date,
  p_workouts jsonb default '[]'::jsonb,
  p_resting_heart_rate numeric default null,
  p_active_energy_kcal numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_workout jsonb;
  v_inserted integer := 0;
begin
  select user_id into v_user_id from public.health_tokens
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      and revoked_at is null;

  if v_user_id is null then
    return null;
  end if;

  for v_workout in select * from jsonb_array_elements(coalesce(p_workouts, '[]'::jsonb))
  loop
    insert into public.health_workouts (user_id, workout_type, started_at, duration_seconds, energy_kcal, avg_heart_rate)
    values (
      v_user_id,
      v_workout->>'type',
      (v_workout->>'started_at')::timestamptz,
      (v_workout->>'duration_seconds')::integer,
      (v_workout->>'energy_kcal')::numeric,
      (v_workout->>'avg_heart_rate')::numeric
    )
    on conflict (user_id, started_at, workout_type) do nothing;

    if found then
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  if p_resting_heart_rate is not null or p_active_energy_kcal is not null then
    insert into public.health_daily_stats (user_id, stat_date, resting_heart_rate, active_energy_kcal, synced_at)
    values (v_user_id, p_date, p_resting_heart_rate, p_active_energy_kcal, now())
    on conflict (user_id, stat_date) do update
      set resting_heart_rate = excluded.resting_heart_rate,
          active_energy_kcal = excluded.active_energy_kcal,
          synced_at = excluded.synced_at;
  end if;

  return jsonb_build_object(
    'workouts_inserted', v_inserted,
    'daily_stats_synced', (p_resting_heart_rate is not null or p_active_energy_kcal is not null)
  );
end;
$$;

grant execute on function public.ingest_health_data_for_token(text, date, jsonb, numeric, numeric) to anon;
