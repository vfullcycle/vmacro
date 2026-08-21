-- FR-FRIEND-1 supersedes FR-DASH-2 — the admin-only feed query is no longer needed now
-- that the feed shows every creator's name (custom_foods is already public-read per
-- FR-FOOD-2, so a plain client query covers "new food from anyone" directly).

drop function if exists public.get_new_admin_foods(timestamptz);
