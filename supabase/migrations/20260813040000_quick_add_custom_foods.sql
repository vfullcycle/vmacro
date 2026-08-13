-- FR-FOOD-6: "quick add" custom foods are entered as a single count-based item
-- (name + kcal/protein/carb/fat totals) with no known real-world serving weight —
-- serving_size_g must become optional to represent that ("servings" quantity mode
-- only; grams mode is disabled client-side whenever this is null, same pattern
-- already used by dish_ingredients.serving_size_g and diary_entries.serving_size_g).
alter table public.custom_foods alter column serving_size_g drop not null;
