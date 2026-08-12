-- Open custom_foods read access to anon (D-012, closes R-07)
-- Food search (FatSecret + custom) is now public — everything else (create/edit/
-- delete custom foods, dishes, diary, favorites, weight log, profile) still
-- requires login since those write with auth.uid()/creator_id.

create policy custom_foods_select_anon on public.custom_foods for select to anon using (true);
