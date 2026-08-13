-- FR-DIARY-2: a meal template should be able to reproduce a meal exactly as it was
-- logged, including one-off quick-add items (FR-FOOD-6) — extend meal_template_items
-- the same way diary_entries already supports source='quick' + quick_name.
alter table public.meal_template_items add column quick_name text;

alter table public.meal_template_items drop constraint meal_template_items_source_check;
alter table public.meal_template_items add constraint meal_template_items_source_check
  check (source in ('custom_food', 'fatsecret', 'dish', 'quick'));
