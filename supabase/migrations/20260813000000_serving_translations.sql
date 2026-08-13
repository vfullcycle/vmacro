-- serving_translations — cache for FatSecret serving_description -> Thai translation (D-015)
-- Same rationale as food_translations: non-sensitive cache data, deduped by primary key,
-- public read+insert (food detail is already public per D-012) — no update/delete since a
-- serving_id's description never changes and cache entries should never be overwritten.

create table public.serving_translations (
  fatsecret_serving_id text primary key,
  thai_description text not null,
  created_at timestamptz not null default now()
);

alter table public.serving_translations enable row level security;

create policy serving_translations_select_all on public.serving_translations for select to anon, authenticated using (true);
create policy serving_translations_insert_all on public.serving_translations for insert to anon, authenticated with check (true);
