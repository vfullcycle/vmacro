-- Temporary instrumentation for BL-11 (search UX) — see PROJECT_BIBLE §7. Purpose is to
-- see where FoodSearch latency actually goes (Supabase vs FatSecret vs Haiku translation)
-- across all 3 current users, not just วี's own devtools. Not meant to become permanent
-- monitoring: drop this table once BL-11's implementation decision is made.

create table public.search_latency_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  query_had_thai boolean not null,
  timings_ms jsonb not null,
  result_counts jsonb not null,
  result_translate_hits int,
  result_translate_misses int,
  created_at timestamptz not null default now(),
  -- abuse/bug guard: a legit payload is well under these sizes (a handful of numeric keys)
  constraint search_latency_log_timings_size check (octet_length(timings_ms::text) <= 2000),
  constraint search_latency_log_counts_size check (octet_length(result_counts::text) <= 500)
);

comment on table public.search_latency_log is
  'Temporary BL-11 instrumentation (2026-08-19) — drop once search UX decision is made.';

alter table public.search_latency_log enable row level security;

-- Search itself is public (D-012), so logging it is too — but a caller can only ever
-- attribute a row to their own uid (or null, for guest search), never someone else's.
-- No select/update/delete policy for anon/authenticated: this is deliberately
-- write-only from the app. วีreads it from the Supabase SQL editor, which runs as
-- postgres and bypasses RLS entirely — no admin-read RPC needed for a throwaway table.
create policy search_latency_log_insert on public.search_latency_log
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
