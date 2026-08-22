-- FR-FRIEND-2 (BL-16): posts in the Friends feed — the first table where any user's
-- write is readable by everyone else, so RLS here needs to be verified for real (not
-- just hidden buttons in the UI) — see docs/REQUIREMENTS.md FR-FRIEND-2 AC (3) for the
-- set_config/set local role verification pattern used on food_requests.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) <= 2000 and char_length(body) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

alter table public.posts enable row level security;

create policy posts_select_all on public.posts for select to authenticated using (true);

create policy posts_insert_own on public.posts for insert to authenticated
  with check (author_id = auth.uid());

create policy posts_update_own on public.posts for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Delete: the author, or an admin moderating anyone's post — admins can only delete, not
-- edit others' content (no admin branch on posts_update_own above, by design).
create policy posts_delete_own_or_admin on public.posts for delete to authenticated
  using (author_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
