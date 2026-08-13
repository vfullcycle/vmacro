-- Open dishes read access to anon, matching custom_foods (D-012) — FR-FOOD-3 AC says a
-- saved dish is shared/searchable "the same way as FR-FOOD-2" (custom foods), which is
-- public since D-012. dish_ingredients needs the same so the detail/nutrition view (which
-- sums ingredient snapshots) works for anonymous visitors too.
create policy dishes_select_anon on public.dishes for select to anon using (true);
create policy dish_ingredients_select_anon on public.dish_ingredients for select to anon using (true);

-- dish_ingredients had no timestamp column (missed in the P0 schema) — needed so the
-- builder can show ingredients in the order they were added instead of random UUID order.
alter table public.dish_ingredients add column created_at timestamptz not null default now();
