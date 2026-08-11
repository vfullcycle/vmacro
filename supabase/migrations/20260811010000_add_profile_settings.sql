-- Add Settings/System fields to profiles (FR-SET-1, P1)
-- Deferred from the P0 schema (20260811000000_init_schema.sql) until P1 actually needed them.

alter table public.profiles
  add column unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  add column default_protein_g_per_kg numeric,
  add column default_fat_pct numeric;
