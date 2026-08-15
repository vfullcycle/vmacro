-- FR-HLTH-2: lets each user name their own Shortcut #1 differently (instead of
-- forcing everyone to use the exact literal "Vmacro: Sync to Health") — the
-- Diary page's "sync now" deep link reads this to build shortcuts://run-shortcut.
alter table public.profiles
  add column health_shortcut_name text not null default 'Vmacro: Sync to Health';
