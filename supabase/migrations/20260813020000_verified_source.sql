-- Record where a verified custom food's data was checked against (e.g. "Thai FCD v3"),
-- so the detail page can show it — not shown in compact search-result rows.
alter table public.custom_foods add column verified_source text;

-- Postgres treats a changed parameter list as a distinct overload, not a replacement —
-- drop the old 2-arg signature explicitly so it doesn't linger alongside the new one.
drop function if exists public.set_food_verified(uuid, boolean);

create or replace function public.set_food_verified(food_id uuid, verified boolean, source text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'not authorized';
  end if;
  update public.custom_foods
  set is_verified = verified,
      verified_source = case when verified then source else null end
  where id = food_id;
end;
$$;

grant execute on function public.set_food_verified(uuid, boolean, text) to authenticated;
