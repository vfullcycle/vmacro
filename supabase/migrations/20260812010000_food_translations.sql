-- food_translations — cache for FatSecret food_name -> Thai translation (D-015)
-- Non-sensitive cache data, deduped by primary key. Public read+insert (search is
-- already public per D-012) — no update/delete since a food_id's name never changes
-- and cache entries should never be overwritten by a later, possibly worse translation.

create table public.food_translations (
  fatsecret_food_id text primary key,
  thai_name text not null,
  created_at timestamptz not null default now()
);

alter table public.food_translations enable row level security;

create policy food_translations_select_all on public.food_translations for select to anon, authenticated using (true);
create policy food_translations_insert_all on public.food_translations for insert to anon, authenticated with check (true);
