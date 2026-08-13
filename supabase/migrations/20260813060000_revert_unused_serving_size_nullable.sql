-- Cleanup: 20260813040000 made custom_foods.serving_size_g nullable for the
-- original FR-FOOD-6 design (quick add creating a custom_foods row). FR-FOOD-6
-- was redesigned in 20260813050000 to insert a one-off diary_entries row
-- (source='quick') instead — nothing in the app writes a null serving_size_g
-- to custom_foods anymore, so this reverts while it's still safe (no row
-- should depend on it). If this fails, a leftover row from testing the old
-- flow needs to be fixed or removed first.
alter table public.custom_foods alter column serving_size_g set not null;
