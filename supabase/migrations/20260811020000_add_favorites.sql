-- favorites — private to owner (FR-DIARY-3)
-- Same source/reference pattern as dish_ingredients/diary_entries: either a
-- custom_food, a dish, or a FatSecret item (referenced by id + name snapshot,
-- since FatSecret items aren't stored locally).

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('custom_food', 'fatsecret', 'dish')),
  custom_food_id uuid references public.custom_foods(id),
  dish_id uuid references public.dishes(id),
  fatsecret_food_id text,
  fatsecret_food_name text,
  created_at timestamptz not null default now(),
  constraint favorites_source_ref check (
    (source = 'custom_food' and custom_food_id is not null and dish_id is null and fatsecret_food_id is null)
    or (source = 'dish' and dish_id is not null and custom_food_id is null and fatsecret_food_id is null)
    or (source = 'fatsecret' and fatsecret_food_id is not null and custom_food_id is null and dish_id is null)
  )
);

create index favorites_user_id_idx on public.favorites(user_id);

-- plain `unique(...)` across nullable columns wouldn't actually block duplicates
-- (NULL <> NULL in SQL uniqueness), so each source gets its own partial index instead
create unique index favorites_unique_custom_food on public.favorites(user_id, custom_food_id) where source = 'custom_food';
create unique index favorites_unique_dish on public.favorites(user_id, dish_id) where source = 'dish';
create unique index favorites_unique_fatsecret on public.favorites(user_id, fatsecret_food_id) where source = 'fatsecret';

alter table public.favorites enable row level security;

create policy favorites_all_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
