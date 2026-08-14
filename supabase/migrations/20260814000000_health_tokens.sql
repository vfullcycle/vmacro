-- Apple Health WRITE (FR-HLTH-1/2, D-020): per-user long-lived API token for the
-- unattended Shortcut to call the VPS daily-summary endpoint with, instead of a
-- short-lived Supabase JWT. Only a hash is ever stored; the plaintext token is
-- returned once by generate_health_token() and never retrievable again.

create table public.health_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- one active token per user — generating a new one implicitly retires the old one
create unique index health_tokens_user_active_idx on public.health_tokens(user_id)
  where revoked_at is null;

alter table public.health_tokens enable row level security;

create policy health_tokens_all_own on public.health_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Generates a new token for the calling user, revoking any existing active one.
-- Returns the plaintext token — shown once in Settings, never stored or returned again.
create or replace function public.generate_health_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  update public.health_tokens
    set revoked_at = now()
    where user_id = auth.uid() and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.health_tokens (user_id, token_hash)
    values (auth.uid(), encode(extensions.digest(v_token, 'sha256'), 'hex'));

  return v_token;
end;
$$;

grant execute on function public.generate_health_token() to authenticated;

-- Revokes the calling user's active token (e.g. disconnect from Settings).
create or replace function public.revoke_health_token()
returns void
language sql
security definer
set search_path = public
as $$
  update public.health_tokens set revoked_at = now()
    where user_id = auth.uid() and revoked_at is null;
$$;

grant execute on function public.revoke_health_token() to authenticated;

-- Resolves an opaque token to a daily totals summary in one step (no separate
-- "verify token -> get user_id -> fetch totals for that user_id" functions —
-- a standalone get_daily_totals(user_id, date) granted to anon would let anyone
-- with the public anon key pull any user's diary totals by guessing a UUID,
-- which breaks the owner-only guarantee FR-AUTH-1's AC requires. Folding
-- verification and the query into one function means the token is the only
-- key that ever unlocks a specific user's data, and an invalid/revoked token
-- returns SQL null (endpoint maps that to 401) rather than someone else's rows.
--
-- Core 4 macros always populated. Extended nutrients are best-effort: sum()
-- returns null when no entry that day carried the key at all (distinct from 0,
-- which means entries had it and it summed to zero). Deliberately excludes
-- trans fat (no HealthKit identifier to write it to) and magnesium/zinc/vitamin
-- B6/B12/folate/phosphorus/water (no real data source anywhere in this system —
-- see FR-HLTH-1 v1.5 in REQUIREMENTS.md).
create or replace function public.get_daily_totals_for_token(p_token text, p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.health_tokens
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      and revoked_at is null;

  if v_user_id is null then
    return null;
  end if;

  return (
    select jsonb_build_object(
      'date', p_date,
      'kcal', coalesce(sum(kcal), 0),
      'protein_g', coalesce(sum(protein_g), 0),
      'carbs_g', coalesce(sum(carbs_g), 0),
      'fat_g', coalesce(sum(fat_g), 0),
      'extended', jsonb_build_object(
        'saturated_fat_g', sum((nutrients->>'saturated_fat_g')::numeric),
        'polyunsaturated_fat_g', sum((nutrients->>'polyunsaturated_fat_g')::numeric),
        'monounsaturated_fat_g', sum((nutrients->>'monounsaturated_fat_g')::numeric),
        'cholesterol_mg', sum((nutrients->>'cholesterol_mg')::numeric),
        'sodium_mg', sum((nutrients->>'sodium_mg')::numeric),
        'fiber_g', sum((nutrients->>'fiber_g')::numeric),
        'sugar_g', sum((nutrients->>'sugar_g')::numeric),
        'potassium_mg', sum((nutrients->'minerals'->>'potassium_mg')::numeric),
        'calcium_mg', sum((nutrients->'minerals'->>'calcium_mg')::numeric),
        'iron_mg', sum((nutrients->'minerals'->>'iron_mg')::numeric),
        'vitamin_c_mg', sum((nutrients->'vitamins'->>'vitamin_c_mg')::numeric),
        'vitamin_d_mcg', sum((nutrients->'vitamins'->>'vitamin_d_mcg')::numeric)
      )
    )
    from public.diary_entries
    where user_id = v_user_id and entry_date = p_date
  );
end;
$$;

grant execute on function public.get_daily_totals_for_token(text, date) to anon;
