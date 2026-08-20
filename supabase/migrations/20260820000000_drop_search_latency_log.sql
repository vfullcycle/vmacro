-- BL-11 instrumentation teardown (2026-08-20) — search_latency_log was always meant to be
-- temporary (see its own creation migration, 20260819000000_search_latency_log.sql):
-- measured what was needed to decide on progressive results/batching/FatSecret toggle,
-- all of which shipped and are now the permanent behavior. Client no longer writes to
-- this table (SEARCH_LATENCY_LOGGING flag + logSearchLatency() removed from
-- web/src/pages/FoodSearch.tsx in the same commit as this migration) — safe to drop.

drop table if exists public.search_latency_log;
