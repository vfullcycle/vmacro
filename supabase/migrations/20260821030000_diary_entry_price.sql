-- FR-DIARY-4 (BL-01, P4c): optional price per diary entry, for food-cost analytics and a
-- future price↔quantity dataset. Nullable — existing entries are unaffected, and it's only
-- ever set from the 4 form-based entry points (FoodDetail x3, QuickAddFoodModal), never the
-- tap-to-add paths (favorites/recent/templates/copy-from-yesterday) that are built around
-- staying at ≤3 taps (FR-DIARY-3).

alter table public.diary_entries add column price_baht numeric;
