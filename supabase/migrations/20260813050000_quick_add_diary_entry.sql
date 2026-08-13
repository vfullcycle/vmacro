-- FR-FOOD-6 (revised): "quick add" is a one-off diary entry, not a reusable food —
-- it must never create a custom_foods row, so it needs its own source + a place to
-- store the free-text name (no custom_food_id/fatsecret_food_id/dish_id to hang it off).
alter table public.diary_entries add column quick_name text;

alter table public.diary_entries drop constraint diary_entries_source_check;
alter table public.diary_entries add constraint diary_entries_source_check
  check (source in ('custom_food', 'fatsecret', 'dish', 'quick'));

alter table public.diary_entries add constraint diary_entries_quick_name_check
  check (source <> 'quick' or (quick_name is not null and custom_food_id is null and dish_id is null and fatsecret_food_id is null));
