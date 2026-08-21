-- FR-FOOD-9 (BL-12, P4c): "ขออาหารใหม่ในแอป" — replaces the cancelled D-023/AI Import as the way
-- users surface a food that's missing from search. A user's own requests are visible only to
-- them + admin (unlike custom_foods, which is globally readable — a request isn't food data,
-- it may include a photo/notes the requester didn't intend to publish to everyone).

create table public.food_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity_note text not null,
  photo_base64 text,
  photo_media_type text,
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'declined')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger food_requests_set_updated_at
  before update on public.food_requests
  for each row execute function public.set_updated_at();

alter table public.food_requests enable row level security;

create policy food_requests_select on public.food_requests for select to authenticated
  using (requester_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy food_requests_insert on public.food_requests for insert to authenticated
  with check (requester_id = auth.uid());

-- Status/admin_note are only ever set via this function, never through a direct UPDATE RLS
-- policy — same reasoning as set_food_verified() (D-017): the admin check has to live
-- somewhere that a requester can't route around by editing their own row.
create or replace function public.set_food_request_status(request_id uuid, new_status text, note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'not authorized';
  end if;
  if new_status not in ('pending', 'fulfilled', 'declined') then
    raise exception 'invalid status';
  end if;
  update public.food_requests set status = new_status, admin_note = note where id = request_id;
end;
$$;

grant execute on function public.set_food_request_status(uuid, text, text) to authenticated;
