-- Per-user FatSecret search toggle (BL-11 item 3) — friend feedback + latency data both point
-- at translation cost scaling with FatSecret result count (see search_latency_log), so give
-- users who don't need FatSecret an escape hatch that skips the fetch+translate legs entirely.
-- Default true at the DB level so existing rows and new signups keep today's behavior.

alter table public.profiles
  add column fatsecret_search_enabled boolean not null default true;
