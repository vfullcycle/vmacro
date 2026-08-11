-- Vmacro schema v1 (P0)
-- Ref: docs/PROJECT_BIBLE.md §4 Data Model, docs/REQUIREMENTS.md FR-AUTH-1
-- Run this whole file once in the Supabase SQL Editor.

-- ============================================================
-- shared helper: auto-bump updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- profiles — 1:1 with auth.users (FR-PROF-1)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  sex text check (sex in ('male', 'female')),
  birth_date date,
  height_cm numeric,
  current_weight_kg numeric,
  body_fat_pct numeric,
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'extra_active')),
  goal text check (goal in ('lose', 'maintain', 'gain')),
  formula_choice text not null default 'mifflin' check (formula_choice in ('mifflin', 'katch_mcardle', 'harris_benedict')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row on invite/signup (D-004: invite-only via Supabase Auth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- custom_foods — shared read, creator-only write (D-002)
-- serving stored in grams by default (R-04 mitigation)
-- ============================================================
create table public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  serving_label text,
  serving_size_g numeric not null,
  kcal numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger custom_foods_set_updated_at
  before update on public.custom_foods
  for each row execute function public.set_updated_at();

create index custom_foods_creator_id_idx on public.custom_foods(creator_id);

-- ============================================================
-- dishes — composed from custom_foods and/or FatSecret items;
-- macro totals are a snapshot at save time (FR-FOOD-3 AC)
-- ============================================================
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kcal numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger dishes_set_updated_at
  before update on public.dishes
  for each row execute function public.set_updated_at();

create index dishes_creator_id_idx on public.dishes(creator_id);

-- ingredient lines for a dish; either a custom_food or a FatSecret item
-- (FatSecret items aren't stored locally, so they're referenced by id + a name snapshot)
create table public.dish_ingredients (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes(id) on delete cascade,
  source text not null check (source in ('custom_food', 'fatsecret')),
  custom_food_id uuid references public.custom_foods(id),
  fatsecret_food_id text,
  fatsecret_food_name text,
  quantity numeric not null,
  serving_size_g numeric,
  kcal numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  constraint dish_ingredients_source_ref check (
    (source = 'custom_food' and custom_food_id is not null and fatsecret_food_id is null)
    or (source = 'fatsecret' and fatsecret_food_id is not null and custom_food_id is null)
  )
);

create index dish_ingredients_dish_id_idx on public.dish_ingredients(dish_id);

-- ============================================================
-- diary_entries — private to owner, macro snapshot at log time
-- (FR-DIARY-1 AC, SCOPE constraint: no re-fetch of historical macros)
-- ============================================================
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  source text not null check (source in ('custom_food', 'fatsecret', 'dish')),
  custom_food_id uuid references public.custom_foods(id),
  dish_id uuid references public.dishes(id),
  fatsecret_food_id text,
  fatsecret_food_name text,
  quantity numeric not null,
  serving_size_g numeric,
  kcal numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  created_at timestamptz not null default now()
);

create index diary_entries_user_date_idx on public.diary_entries(user_id, entry_date);

-- ============================================================
-- meal_templates — private to owner (FR-DIARY-2/3)
-- ============================================================
create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.meal_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.meal_templates(id) on delete cascade,
  source text not null check (source in ('custom_food', 'fatsecret', 'dish')),
  custom_food_id uuid references public.custom_foods(id),
  dish_id uuid references public.dishes(id),
  fatsecret_food_id text,
  fatsecret_food_name text,
  quantity numeric not null,
  serving_size_g numeric
);

create index meal_template_items_template_id_idx on public.meal_template_items(template_id);

-- ============================================================
-- health_samples — private to owner, idempotent ingest (FR-HLTH-3 AC)
-- ============================================================
create table public.health_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sample_type text not null check (sample_type in ('workout', 'heart_rate', 'active_energy')),
  recorded_at timestamptz not null,
  source text not null default 'apple_health',
  value_numeric numeric,
  duration_seconds numeric,
  workout_type text,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, sample_type, recorded_at, source)
);

create index health_samples_user_id_idx on public.health_samples(user_id);

-- ============================================================
-- weight_logs — private to owner, trend history (FR-PROF-2)
-- ============================================================
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric not null,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index weight_logs_user_id_idx on public.weight_logs(user_id, logged_at);

-- ============================================================
-- RLS (FR-AUTH-1)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.custom_foods enable row level security;
alter table public.dishes enable row level security;
alter table public.dish_ingredients enable row level security;
alter table public.diary_entries enable row level security;
alter table public.meal_templates enable row level security;
alter table public.meal_template_items enable row level security;
alter table public.health_samples enable row level security;
alter table public.weight_logs enable row level security;

-- profiles: owner only
create policy profiles_all_own on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- custom_foods: shared read, creator-only write (D-002)
create policy custom_foods_select_all on public.custom_foods for select to authenticated using (true);
create policy custom_foods_write_own on public.custom_foods for all to authenticated
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());

-- dishes: shared read, creator-only write (FR-FOOD-3)
create policy dishes_select_all on public.dishes for select to authenticated using (true);
create policy dishes_write_own on public.dishes for all to authenticated
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());

-- dish_ingredients: follows parent dish's shared-read / creator-write
create policy dish_ingredients_select_all on public.dish_ingredients for select to authenticated using (true);
create policy dish_ingredients_write_own on public.dish_ingredients for all to authenticated
  using (exists (select 1 from public.dishes d where d.id = dish_ingredients.dish_id and d.creator_id = auth.uid()))
  with check (exists (select 1 from public.dishes d where d.id = dish_ingredients.dish_id and d.creator_id = auth.uid()));

-- diary_entries: owner only
create policy diary_entries_all_own on public.diary_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- meal_templates: owner only
create policy meal_templates_all_own on public.meal_templates for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- meal_template_items: follows parent template's ownership
create policy meal_template_items_all_own on public.meal_template_items for all to authenticated
  using (exists (select 1 from public.meal_templates t where t.id = meal_template_items.template_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.meal_templates t where t.id = meal_template_items.template_id and t.user_id = auth.uid()));

-- health_samples: owner only
create policy health_samples_all_own on public.health_samples for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- weight_logs: owner only
create policy weight_logs_all_own on public.weight_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
