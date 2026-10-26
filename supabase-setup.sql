-- Run this in Supabase Dashboard > SQL Editor.
-- This starter stores the current game snapshot in one row per room.
-- Only room members should use room codes privately; see README for prototype limits.

create table if not exists public.ludo_games (
  room_code text primary key check (room_code ~ '^[A-Z0-9]{4,8}$'),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.ludo_games enable row level security;

-- For a beginner prototype, this policy permits anonymous clients to read/write
-- game snapshots. Anyone who knows a room code could tamper with that room.
-- Do NOT use this permissive policy for a public competitive game with real stakes.
drop policy if exists "Prototype: read ludo games" on public.ludo_games;
create policy "Prototype: read ludo games"
  on public.ludo_games for select
  to anon, authenticated
  using (true);

drop policy if exists "Prototype: create ludo games" on public.ludo_games;
create policy "Prototype: create ludo games"
  on public.ludo_games for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Prototype: update ludo games" on public.ludo_games;
create policy "Prototype: update ludo games"
  on public.ludo_games for update
  to anon, authenticated
  using (true)
  with check (true);

alter publication supabase_realtime add table public.ludo_games;
